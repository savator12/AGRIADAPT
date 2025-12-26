import rulesData from './rules.json'
import { weatherService, WeatherData } from '../weather'
import { prisma } from '../prisma'
import { FarmType, WaterAccess } from '@prisma/client'

interface Rule {
  id: string
  name: string
  condition: {
    weather?: {
      droughtRisk?: string | string[]
      floodRisk?: string | string[]
      maxTemp?: {
        gte?: number
        lte?: number
      }
    }
    farmer?: {
      waterAccess?: string
      soilType?: string
      cropType?: string
      farmType?: string
    }
  }
  risk: string
  recommendations: string[]
  explanation: string
}

interface FarmerProfile {
  id: string
  farmType: FarmType
  cropType: string | null
  soilType: string | null
  waterAccess: WaterAccess
  kebeleId: string
  latitude: number | null
  longitude: number | null
}

interface AdvisoryResult {
  riskSummary: {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    droughtRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    floodRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    heatRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  }
  recommendations: Array<{
    ruleId: string
    ruleName: string
    priority: number
    actions: string[]
    explanation: string
  }>
  triggeredRules: string[]
  weatherSummary: {
    avgRainfall: number
    maxTemp: number
    minTemp: number
    next7Days: {
      rainfallProb: number
      rainfallMm: number
    }
  }
}

class AdvisoryEngine {
  private rules: Rule[] = rulesData.rules as Rule[]

  /**
   * Check if a condition matches
   */
  private matchesCondition(
    condition: Rule['condition'],
    weather: WeatherData,
    farmer: FarmerProfile
  ): boolean {
    if (condition.weather) {
      const w = condition.weather
      
      if (w.droughtRisk) {
        const risk = weather.summary.droughtRisk
        if (Array.isArray(w.droughtRisk)) {
          if (!w.droughtRisk.includes(risk)) return false
        } else if (w.droughtRisk !== risk) {
          return false
        }
      }
      
      if (w.floodRisk) {
        const risk = weather.summary.floodRisk
        if (Array.isArray(w.floodRisk)) {
          if (!w.floodRisk.includes(risk)) return false
        } else if (w.floodRisk !== risk) {
          return false
        }
      }
      
      if (w.maxTemp) {
        if (w.maxTemp.gte && weather.summary.maxTemp < w.maxTemp.gte) return false
        if (w.maxTemp.lte && weather.summary.maxTemp > w.maxTemp.lte) return false
      }
    }
    
    if (condition.farmer) {
      const f = condition.farmer
      
      if (f.waterAccess && f.waterAccess !== farmer.waterAccess) return false
      if (f.soilType && f.soilType !== farmer.soilType) return false
      if (f.cropType && f.cropType !== farmer.cropType) return false
      if (f.farmType && f.farmType !== farmer.farmType) return false
    }
    
    return true
  }

  /**
   * Generate advisory for a farmer
   */
  async generateAdvisory(farmerId: string): Promise<AdvisoryResult> {
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
      throw new Error('Farmer not found')
    }
    
    // Get weather data
    const latitude = farmer.latitude ?? farmer.kebele.latitude ?? 9.1450 // Default to Addis Ababa
    const longitude = farmer.longitude ?? farmer.kebele.longitude ?? 38.7617
    
    const weather = await weatherService.getWeatherSnapshot(
      farmer.kebeleId,
      latitude,
      longitude
    )
    
    // Evaluate rules
    const triggeredRules: Rule[] = []
    
    for (const rule of this.rules) {
      if (this.matchesCondition(rule.condition, weather, farmer)) {
        triggeredRules.push(rule)
      }
    }
    
    // Build recommendations
    const recommendations = triggeredRules.map((rule, index) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.risk === 'HIGH' ? 1 : rule.risk === 'MEDIUM' ? 2 : 3,
      actions: rule.recommendations,
      explanation: rule.explanation,
    }))
    
    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority)
    
    // Determine overall risk
    const riskLevels = triggeredRules.map(r => r.risk)
    const overallRisk = riskLevels.includes('HIGH')
      ? 'HIGH'
      : riskLevels.includes('MEDIUM')
      ? 'MEDIUM'
      : 'LOW'
    
    // Calculate next 7 days summary
    const next7Days = weather.forecasts.slice(0, 7)
    const avgRainfallProb = next7Days.reduce((sum, f) => sum + f.rainfallProb, 0) / 7
    const totalRainfallMm = next7Days.reduce((sum, f) => sum + f.rainfallMm, 0)
    
    // Calculate heat risk
    const heatRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 
      weather.summary.maxTemp > 35 ? 'HIGH' : 
      weather.summary.maxTemp > 30 ? 'MEDIUM' : 
      'LOW'

    const result: AdvisoryResult = {
      riskSummary: {
        overallRisk,
        droughtRisk: weather.summary.droughtRisk,
        floodRisk: weather.summary.floodRisk,
        heatRisk,
      },
      recommendations,
      triggeredRules: triggeredRules.map(r => r.id),
      weatherSummary: {
        avgRainfall: weather.summary.avgRainfall,
        maxTemp: weather.summary.maxTemp,
        minTemp: weather.summary.minTemp,
        next7Days: {
          rainfallProb: avgRainfallProb,
          rainfallMm: totalRainfallMm,
        },
      },
    }
    
    return result
  }

  /**
   * Render advisory text in farmer's language using Gemini AI
   */
  async renderAdvisoryText(advisory: AdvisoryResult, language: string = 'am', farmer?: any): Promise<string> {
    console.log(`[Advisory Engine] renderAdvisoryText called with language: ${language}, farmer: ${farmer?.fullName || 'none'}`)
    console.log(`[Advisory Engine] Gemini API Key configured: ${!!process.env.GOOGLE_GEMINI_API_KEY}`)
    
    // Try to use Gemini AI if available and farmer info is provided
    if (farmer && process.env.GOOGLE_GEMINI_API_KEY) {
      try {
        console.log(`[Advisory Engine] Attempting to use Gemini AI for language: ${language}`)
        const { generateAdvisoryWithGemini } = await import('../ai/gemini')
        
        const farmerInfo = {
          fullName: farmer.fullName,
          phone: farmer.phone,
          language: language, // Use the provided language parameter
          cropType: farmer.cropType,
          farmType: farmer.farmType,
          soilType: farmer.soilType,
          waterAccess: farmer.waterAccess,
          farmSizeHa: farmer.farmSizeHa,
          location: farmer.kebele 
            ? `${farmer.kebele.name}, ${farmer.kebele.woreda?.name || ''}, ${farmer.kebele.woreda?.zone?.name || ''}`
            : 'Ethiopia',
        }

        const weatherInfo = {
          avgRainfall: advisory.weatherSummary.avgRainfall,
          maxTemp: advisory.weatherSummary.maxTemp,
          minTemp: advisory.weatherSummary.minTemp,
          next7Days: advisory.weatherSummary.next7Days,
          droughtRisk: advisory.riskSummary.droughtRisk,
          floodRisk: advisory.riskSummary.floodRisk,
          heatRisk: advisory.riskSummary.heatRisk,
        }

        const geminiText = await generateAdvisoryWithGemini(
          farmerInfo,
          weatherInfo,
          advisory.recommendations,
          advisory.riskSummary.overallRisk,
          language // Pass language explicitly
        )
        
        console.log(`[Advisory Engine] Successfully generated with Gemini. Text preview: ${geminiText.substring(0, 100)}...`)
        return geminiText
      } catch (error: any) {
        console.error('[Advisory Engine] Failed to generate advisory with Gemini, falling back to default:', error)
        console.error('[Advisory Engine] Error details:', error.message, error.stack)
        // Fall through to default rendering
      }
    } else {
      console.log(`[Advisory Engine] Using fallback text generation. Reason: ${!farmer ? 'No farmer info' : 'No Gemini API key'}`)
    }

    // Fallback to simple English rendering
    const lines: string[] = []
    
    lines.push(`Weather Advisory - ${new Date().toLocaleDateString()}`)
    lines.push('')
    
    lines.push(`Overall Risk: ${advisory.riskSummary.overallRisk}`)
    lines.push(`Drought Risk: ${advisory.riskSummary.droughtRisk}`)
    lines.push(`Flood Risk: ${advisory.riskSummary.floodRisk}`)
    lines.push(`Heat Risk: ${advisory.riskSummary.heatRisk}`)
    lines.push('')
    
    lines.push('Weather Summary:')
    lines.push(`- Average Rainfall: ${advisory.weatherSummary.avgRainfall.toFixed(1)}mm`)
    lines.push(`- Temperature Range: ${advisory.weatherSummary.minTemp}°C - ${advisory.weatherSummary.maxTemp}°C`)
    lines.push(`- Next 7 Days Rainfall: ${advisory.weatherSummary.next7Days.rainfallMm.toFixed(1)}mm expected`)
    lines.push('')
    
    lines.push('Recommendations:')
    advisory.recommendations.forEach((rec, idx) => {
      lines.push(`${idx + 1}. ${rec.ruleName}`)
      rec.actions.forEach(action => {
        lines.push(`   - ${action}`)
      })
      lines.push(`   Reason: ${rec.explanation}`)
      lines.push('')
    })
    
    return lines.join('\n')
  }

  /**
   * Save advisory to database
   */
  async saveAdvisory(
    farmerId: string,
    advisory: AdvisoryResult,
    renderedText: string,
    language: string = 'am'
  ): Promise<string> {
    const saved = await prisma.advisory.create({
      data: {
        farmerId,
        riskSummaryJson: advisory.riskSummary as any,
        recommendationsJson: advisory.recommendations as any,
        renderedText,
        language,
        explanationJson: {
          triggeredRules: advisory.triggeredRules,
          weatherSummary: advisory.weatherSummary,
        } as any,
      },
    })
    
    return saved.id
  }
}

export const advisoryEngine = new AdvisoryEngine()



