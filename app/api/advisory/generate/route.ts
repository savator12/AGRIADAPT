import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { advisoryEngine } from '@/lib/advisory/engine'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth([UserRole.KEBELE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN])
    
    const searchParams = request.nextUrl.searchParams
    const farmerId = searchParams.get('farmerId')
    const language = searchParams.get('language') || null // Optional language override

    if (!farmerId) {
      return NextResponse.json(
        { error: 'Farmer ID is required' },
        { status: 400 }
      )
    }

    // Check farmer exists and user has access
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      include: {
        kebele: {
          include: {
            woreda: {
              include: {
                zone: true,
              },
            },
          },
        },
      },
    })

    if (!farmer) {
      return NextResponse.json(
        { error: 'Farmer not found' },
        { status: 404 }
      )
    }

    if (user.role === UserRole.KEBELE_STAFF && user.kebeleId !== farmer.kebeleId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Use provided language or farmer's default language
    const targetLanguage = language || farmer.language

    // Generate advisory
    const advisory = await advisoryEngine.generateAdvisory(farmerId)
    
    // Log language being used
    console.log(`[Advisory Generation] Farmer: ${farmer.fullName}, Selected Language: ${targetLanguage}, Farmer Default: ${farmer.language}`)
    
    const renderedText = await advisoryEngine.renderAdvisoryText(advisory, targetLanguage, farmer)
    const advisoryId = await advisoryEngine.saveAdvisory(farmerId, advisory, renderedText, targetLanguage)
    
    console.log(`[Advisory Generation] Advisory ID: ${advisoryId}, Language: ${targetLanguage}, Text Length: ${renderedText.length}`)

    // Generate and send SMS advisory if farmer has consent and active subscription
    if (farmer.consent && farmer.phone) {
      try {
        const { generateSMSAdvisoryWithGemini } = await import('@/lib/ai/gemini')
        const { getSMSProvider } = await import('@/lib/sms/provider')
        const { AlertType, AlertSeverity, AlertStatus } = await import('@prisma/client')

        // Generate SMS message using Gemini (use same language as advisory)
        let smsText: string
        try {
          smsText = await generateSMSAdvisoryWithGemini(
            {
              fullName: farmer.fullName,
              phone: farmer.phone,
              language: targetLanguage,
              cropType: farmer.cropType,
              farmType: farmer.farmType,
              soilType: farmer.soilType,
              waterAccess: farmer.waterAccess,
              farmSizeHa: farmer.farmSizeHa,
              location: farmer.kebele 
                ? `${farmer.kebele.name}, ${farmer.kebele.woreda?.name || ''}, ${farmer.kebele.woreda?.zone?.name || ''}`
                : 'Ethiopia',
            },
            {
              avgRainfall: advisory.weatherSummary.avgRainfall,
              maxTemp: advisory.weatherSummary.maxTemp,
              minTemp: advisory.weatherSummary.minTemp,
              next7Days: advisory.weatherSummary.next7Days,
              droughtRisk: advisory.riskSummary.droughtRisk,
              floodRisk: advisory.riskSummary.floodRisk,
              heatRisk: advisory.riskSummary.heatRisk,
            },
            advisory.recommendations,
            advisory.riskSummary.overallRisk,
            targetLanguage
          )
        } catch (smsError: any) {
          // If quota exceeded, log it but don't fail the advisory generation
          const isQuotaError = smsError.message?.toLowerCase().includes('quota') || 
                              smsError.message?.includes('429') ||
                              smsError.message?.toLowerCase().includes('exceeded')
          
          if (isQuotaError) {
            console.error('[Advisory API] Gemini quota exceeded - SMS generation skipped:', smsError.message)
            // Skip SMS generation but continue with advisory
            return NextResponse.json({
              success: true,
              advisory: {
                id: advisoryId,
                riskSummary: advisory.riskSummary,
                recommendations: advisory.recommendations,
                language: targetLanguage,
                textPreview: renderedText.substring(0, 200) + '...',
              },
              warning: 'Advisory generated successfully, but SMS could not be sent due to API quota limits. Please check your Gemini API quota.',
              debug: {
                selectedLanguage: language,
                farmerLanguage: farmer.language,
                targetLanguage: targetLanguage,
                geminiConfigured: !!process.env.GOOGLE_GEMINI_API_KEY,
                textLength: renderedText.length,
                smsError: smsError.message,
              },
            })
          }
          // For other errors, just log and continue
          throw smsError
        }

        // Create alert record
        const alert = await prisma.alert.create({
          data: {
            farmerId: farmer.id,
            type: AlertType.CUSTOM,
            severity: advisory.riskSummary.overallRisk === 'HIGH' 
              ? AlertSeverity.HIGH 
              : advisory.riskSummary.overallRisk === 'MEDIUM' 
              ? AlertSeverity.MEDIUM 
              : AlertSeverity.LOW,
            messageText: smsText,
            scheduleTime: new Date(),
            status: AlertStatus.QUEUED,
          },
        })

        // Send SMS immediately
        const smsProvider = getSMSProvider()
        const smsResult = await smsProvider.send({
          to: farmer.phone,
          message: smsText,
          alertId: alert.id,
        })

        if (!smsResult.success) {
          console.error(`Failed to send SMS to ${farmer.phone}:`, smsResult.error)
        }
      } catch (error: any) {
        // Log error but don't fail the advisory generation
        const isQuotaError = error.message?.toLowerCase().includes('quota') || 
                            error.message?.includes('429') ||
                            error.message?.toLowerCase().includes('exceeded')
        
        if (isQuotaError) {
          console.error('[Advisory API] Gemini quota exceeded - SMS generation skipped:', error.message)
        } else {
          console.error('[Advisory API] Error sending SMS advisory:', error)
        }
      }
    }

    // Log audit
    await logAudit(
      user.id,
      'GENERATE_ADVISORY',
      'Advisory',
      advisoryId,
      null,
      { farmerId, advisoryId }
    )

    return NextResponse.json({
      success: true,
      advisory: {
        id: advisoryId,
        riskSummary: advisory.riskSummary,
        recommendations: advisory.recommendations,
        language: targetLanguage,
        textPreview: renderedText.substring(0, 200) + '...',
      },
      debug: {
        selectedLanguage: language,
        farmerLanguage: farmer.language,
        targetLanguage: targetLanguage,
        geminiConfigured: !!process.env.GOOGLE_GEMINI_API_KEY,
        textLength: renderedText.length,
      },
    })
  } catch (error: any) {
    console.error('[Advisory API] Error generating advisory:', error)
    console.error('[Advisory API] Error stack:', error.stack)
    
    // Check if it's an API key error
    const isApiKeyError = error.message?.toLowerCase().includes('api key') ||
                         error.message?.toLowerCase().includes('api_key') ||
                         error.message?.toLowerCase().includes('api key expired') ||
                         error.message?.toLowerCase().includes('api key invalid') ||
                         error.message?.toLowerCase().includes('invalid api key') ||
                         error.message?.includes('401') ||
                         error.message?.includes('403')
    
    if (isApiKeyError) {
      return NextResponse.json(
        { 
          error: 'Gemini API key is invalid or expired.',
          details: 'Please check your GOOGLE_GEMINI_API_KEY in .env.local file. Get a new API key from https://aistudio.google.com/app/apikey',
          apiKeyInvalid: true,
          helpUrl: 'https://aistudio.google.com/app/apikey',
        },
        { status: 401 }
      )
    }
    
    // Check if it's a quota error
    const isQuotaError = error.message?.toLowerCase().includes('quota') || 
                        error.message?.includes('429') ||
                        error.message?.toLowerCase().includes('exceeded') ||
                        error.message?.toLowerCase().includes('too many requests')
    
    if (isQuotaError) {
      return NextResponse.json(
        { 
          error: 'Gemini API quota exceeded. Please check your billing and quota limits.',
          details: 'You have exceeded your current quota. Please check your plan and billing details at https://ai.dev/usage?tab=rate-limit',
          quotaExceeded: true,
          helpUrl: 'https://ai.google.dev/gemini-api/docs/rate-limits',
        },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}



