import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
    })

    // Generate CSV
    const headers = [
      'ID',
      'Full Name',
      'Phone',
      'Language',
      'Region',
      'Zone',
      'Woreda',
      'Kebele',
      'Farm Type',
      'Crop Type',
      'Soil Type',
      'Farm Size (ha)',
      'Water Access',
      'Consent',
      'Active Subscription',
      'Registered Date',
    ]

    const rows = farmers.map((farmer) => [
      farmer.id,
      farmer.fullName,
      farmer.phone,
      farmer.language,
      farmer.kebele.woreda.zone.region.name,
      farmer.kebele.woreda.zone.name,
      farmer.kebele.woreda.name,
      farmer.kebele.name,
      farmer.farmType,
      farmer.cropType || '',
      farmer.soilType || '',
      farmer.farmSizeHa?.toString() || '',
      farmer.waterAccess,
      farmer.consent ? 'Yes' : 'No',
      farmer.subscriptions.length > 0 ? 'Yes' : 'No',
      farmer.createdAt.toISOString().split('T')[0],
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="farmers_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting farmers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




