import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import { alertEngine } from '@/lib/sms/alert-engine'
import { advisoryEngine } from '@/lib/advisory/engine'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth([UserRole.KEBELE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN])
    
    const body = await request.json()
    const {
      fullName,
      phone,
      language,
      kebeleId,
      kebeleName,
      latitude,
      longitude,
      farmType,
      cropType,
      soilType,
      farmSizeHa,
      waterAccess,
      consent,
    } = body

    // Validate required fields
    if (!fullName || !phone || (!kebeleId && !kebeleName) || !farmType || !waterAccess) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Handle kebele - use kebeleId if provided, otherwise find/create by name
    let finalKebeleId = kebeleId
    if (!finalKebeleId && kebeleName) {
      // Try to find existing kebele by name
      const existingKebele = await prisma.kebele.findFirst({
        where: {
          name: {
            equals: kebeleName.trim(),
            mode: 'insensitive',
          },
        },
      })

      if (existingKebele) {
        finalKebeleId = existingKebele.id
      } else {
        // For now, return error if kebele not found
        // In production, you might want to create it or require admin to create it first
        return NextResponse.json(
          { error: `Kebele "${kebeleName}" not found. Please select an existing kebele or contact an administrator.` },
          { status: 400 }
        )
      }
    }

    // Validate phone format (basic E.164 check)
    if (!phone.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +251911234567)' },
        { status: 400 }
      )
    }

    // Check if phone already exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { phone },
    })

    if (existingFarmer) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      )
    }

    // Validate kebele access
    if (user.role === UserRole.KEBELE_STAFF && user.kebeleId !== finalKebeleId) {
      return NextResponse.json(
        { error: 'Unauthorized to register farmers in this kebele' },
        { status: 403 }
      )
    }

    // Get kebele for default coordinates
    const kebele = await prisma.kebele.findUnique({
      where: { id: finalKebeleId },
    })

    if (!kebele) {
      return NextResponse.json(
        { error: 'Kebele not found' },
        { status: 404 }
      )
    }

    // Create farmer
    const farmer = await prisma.farmer.create({
      data: {
        fullName,
        phone,
        language: language || 'am',
        kebeleId: finalKebeleId,
        latitude: latitude ?? kebele.latitude,
        longitude: longitude ?? kebele.longitude,
        farmType,
        cropType: cropType || null,
        soilType: soilType || null,
        farmSizeHa: farmSizeHa ? parseFloat(farmSizeHa) : null,
        waterAccess,
        consent: consent || false,
      },
    })

    // Create subscription if consent given
    let subscription = null
    if (consent) {
      subscription = await prisma.subscription.create({
        data: {
          farmerId: farmer.id,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      })

      // Generate initial advisory
      try {
        const advisory = await advisoryEngine.generateAdvisory(farmer.id)
        const renderedText = await advisoryEngine.renderAdvisoryText(advisory, farmer.language)
        await advisoryEngine.saveAdvisory(farmer.id, advisory, renderedText, farmer.language)

        // Generate initial alerts
        await alertEngine.generateAlertsForFarmer(farmer.id)
      } catch (error) {
        console.error('Error generating advisory/alerts:', error)
        // Don't fail registration if advisory generation fails
      }
    }

    // Log audit
    await logAudit(
      user.id,
      'CREATE_FARMER',
      'Farmer',
      farmer.id,
      null,
      { id: farmer.id, fullName: farmer.fullName, phone: farmer.phone }
    )

    return NextResponse.json({
      success: true,
      farmer: {
        id: farmer.id,
        fullName: farmer.fullName,
        phone: farmer.phone,
        kebeleId: farmer.kebeleId,
      },
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
      } : null,
    })
  } catch (error: any) {
    console.error('Error creating farmer:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth([UserRole.KEBELE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN])
    
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const kebeleId = searchParams.get('kebeleId')

    // Build where clause
    const where: any = {}

    if (user.role === UserRole.KEBELE_STAFF) {
      if (!user.kebeleId) {
        return NextResponse.json({ farmers: [] })
      }
      where.kebeleId = user.kebeleId
    } else if (kebeleId) {
      where.kebeleId = kebeleId
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const farmers = await prisma.farmer.findMany({
      where,
      include: {
        kebele: {
          include: {
            woreda: {
              include: {
                zone: {
                  include: {
                    region: true,
                  },
                },
              },
            },
          },
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ farmers })
  } catch (error: any) {
    console.error('Error fetching farmers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



