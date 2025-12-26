import { prisma } from './prisma'

export interface WeatherForecast {
  periodStart: Date
  periodEnd: Date
  rainfallProb: number // 0-100
  rainfallMm: number
  tempMax: number
  tempMin: number
  humidity?: number
}

export interface WeatherData {
  forecasts: WeatherForecast[]
  summary: {
    avgRainfall: number
    maxTemp: number
    minTemp: number
    droughtRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    floodRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  }
}

class WeatherService {
  /**
   * Generate mock weather forecast based on location
   * In production, this would call a real weather API
   */
  async getForecast(latitude: number, longitude: number, days: number = 14): Promise<WeatherData> {
    // Use location as seed for consistent mock data
    const seed = Math.floor((latitude + longitude) * 1000) % 1000
    
    const forecasts: WeatherForecast[] = []
    const now = new Date()
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      
      // Generate pseudo-random but consistent values based on seed and day
      const daySeed = (seed + i * 7) % 100
      const rainfallProb = Math.max(0, Math.min(100, 30 + (daySeed % 40)))
      const rainfallMm = rainfallProb > 50 ? (daySeed % 20) : 0
      const tempMax = 25 + (daySeed % 10)
      const tempMin = tempMax - 8 - (daySeed % 5)
      
      forecasts.push({
        periodStart: new Date(date.setHours(0, 0, 0, 0)),
        periodEnd: new Date(date.setHours(23, 59, 59, 999)),
        rainfallProb,
        rainfallMm,
        tempMax,
        tempMin,
        humidity: 50 + (daySeed % 30),
      })
    }
    
    const avgRainfall = forecasts.reduce((sum, f) => sum + f.rainfallMm, 0) / days
    const maxTemp = Math.max(...forecasts.map(f => f.tempMax))
    const minTemp = Math.min(...forecasts.map(f => f.tempMin))
    
    // Calculate risks
    const droughtRisk = avgRainfall < 5 ? 'HIGH' : avgRainfall < 10 ? 'MEDIUM' : 'LOW'
    const heavyRainDays = forecasts.filter(f => f.rainfallMm > 15).length
    const floodRisk = heavyRainDays > 3 ? 'HIGH' : heavyRainDays > 1 ? 'MEDIUM' : 'LOW'
    
    return {
      forecasts,
      summary: {
        avgRainfall,
        maxTemp,
        minTemp,
        droughtRisk,
        floodRisk,
      },
    }
  }

  /**
   * Get or create weather snapshot for a kebele
   */
  async getWeatherSnapshot(kebeleId: string, latitude: number, longitude: number): Promise<WeatherData> {
    // Check for recent snapshot (within last 6 hours)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
    
    const existing = await prisma.weatherSnapshot.findFirst({
      where: {
        kebeleId,
        createdAt: {
          gte: sixHoursAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    if (existing) {
      return existing.rawJson as WeatherData
    }
    
    // Generate new forecast
    const weatherData = await this.getForecast(latitude, longitude)
    
    // Store snapshot
    const periodStart = new Date()
    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + 14)
    
    await prisma.weatherSnapshot.create({
      data: {
        kebeleId,
        latitude,
        longitude,
        periodStart,
        periodEnd,
        rawJson: weatherData as any,
      },
    })
    
    return weatherData
  }
}

export const weatherService = new WeatherService()




