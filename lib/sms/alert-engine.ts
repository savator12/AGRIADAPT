import { prisma } from '../prisma'
import { AlertType, AlertSeverity, AlertStatus } from '@prisma/client'
import { getSMSProvider, SMSMessage } from './provider'
import { advisoryEngine } from '../advisory/engine'

interface AlertTemplate {
  type: AlertType
  severity: AlertSeverity
  generateMessage: (context: any) => string
}

class AlertEngine {
  private templates: Map<AlertType, AlertTemplate> = new Map()

  constructor() {
    this.registerTemplates()
  }

  private registerTemplates() {
    this.templates.set(AlertType.DROUGHT, {
      type: AlertType.DROUGHT,
      severity: AlertSeverity.HIGH,
      generateMessage: (context: { days: number; farmerName?: string }) => {
        const name = context.farmerName ? `${context.farmerName}, ` : ''
        return `${name}Drought Alert: No significant rainfall expected for next ${context.days} days. Consider water-saving measures and delay planting if possible. - ET-SAFE`
      },
    })

    this.templates.set(AlertType.HEAVY_RAINFALL, {
      type: AlertType.HEAVY_RAINFALL,
      severity: AlertSeverity.MEDIUM,
      generateMessage: (context: { rainfallMm: number; farmerName?: string }) => {
        const name = context.farmerName ? `${context.farmerName}, ` : ''
        return `${name}Heavy Rain Alert: ${context.rainfallMm.toFixed(1)}mm expected in next 48h. Prepare drainage and avoid fertilizer application. - ET-SAFE`
      },
    })

    this.templates.set(AlertType.TEMPERATURE_EXTREME, {
      type: AlertType.TEMPERATURE_EXTREME,
      severity: AlertSeverity.MEDIUM,
      generateMessage: (context: { temp: number; isHot: boolean; farmerName?: string }) => {
        const name = context.farmerName ? `${context.farmerName}, ` : ''
        const type = context.isHot ? 'Heat' : 'Cold'
        return `${name}${type} Alert: Extreme temperature ${context.temp}°C expected. Take protective measures for crops and livestock. - ET-SAFE`
      },
    })

    this.templates.set(AlertType.PLANTING_REMINDER, {
      type: AlertType.PLANTING_REMINDER,
      severity: AlertSeverity.LOW,
      generateMessage: (context: { cropType: string; farmerName?: string }) => {
        const name = context.farmerName ? `${context.farmerName}, ` : ''
        return `${name}Planting Reminder: Optimal planting window for ${context.cropType} is approaching. Prepare fields and seeds. - ET-SAFE`
      },
    })

    this.templates.set(AlertType.MARKET_PRICE, {
      type: AlertType.MARKET_PRICE,
      severity: AlertSeverity.LOW,
      generateMessage: (context: { cropType: string; price: number; farmerName?: string }) => {
        const name = context.farmerName ? `${context.farmerName}, ` : ''
        return `${name}Market Update: ${context.cropType} price is ${context.price} ETB/kg at local market. - ET-SAFE`
      },
    })
  }

  /**
   * Generate alerts for a farmer based on their advisory
   */
  async generateAlertsForFarmer(farmerId: string): Promise<string[]> {
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
        },
      },
    })

    if (!farmer || !farmer.consent) {
      return []
    }

    if (farmer.subscriptions.length === 0) {
      return []
    }

    // Generate advisory
    const advisory = await advisoryEngine.generateAdvisory(farmerId)

    const alertIds: string[] = []
    const now = new Date()

    // Drought alert
    if (advisory.riskSummary.droughtRisk === 'HIGH') {
      const alert = await prisma.alert.create({
        data: {
          farmerId,
          type: AlertType.DROUGHT,
          severity: AlertSeverity.HIGH,
          messageText: this.templates.get(AlertType.DROUGHT)!.generateMessage({
            days: 14,
            farmerName: farmer.fullName,
          }),
          scheduleTime: now,
          status: AlertStatus.QUEUED,
        },
      })
      alertIds.push(alert.id)
    }

    // Heavy rainfall alert
    if (advisory.riskSummary.floodRisk === 'HIGH' || advisory.riskSummary.floodRisk === 'MEDIUM') {
      const rainfall = advisory.weatherSummary.next7Days.rainfallMm
      if (rainfall > 20) {
        const alert = await prisma.alert.create({
          data: {
            farmerId,
            type: AlertType.HEAVY_RAINFALL,
            severity: AlertSeverity.MEDIUM,
            messageText: this.templates.get(AlertType.HEAVY_RAINFALL)!.generateMessage({
              rainfallMm: rainfall,
              farmerName: farmer.fullName,
            }),
            scheduleTime: now,
            status: AlertStatus.QUEUED,
          },
        })
        alertIds.push(alert.id)
      }
    }

    // Temperature extreme alert
    if (advisory.riskSummary.heatRisk === 'HIGH') {
      const alert = await prisma.alert.create({
        data: {
          farmerId,
          type: AlertType.TEMPERATURE_EXTREME,
          severity: AlertSeverity.MEDIUM,
          messageText: this.templates.get(AlertType.TEMPERATURE_EXTREME)!.generateMessage({
            temp: advisory.weatherSummary.maxTemp,
            isHot: true,
            farmerName: farmer.fullName,
          }),
          scheduleTime: now,
          status: AlertStatus.QUEUED,
        },
      })
      alertIds.push(alert.id)
    }

    return alertIds
  }

  /**
   * Process queued alerts and send SMS
   */
  async processQueuedAlerts(limit: number = 100): Promise<{ sent: number; failed: number }> {
    const queuedAlerts = await prisma.alert.findMany({
      where: {
        status: AlertStatus.QUEUED,
        scheduleTime: {
          lte: new Date(),
        },
      },
      include: {
        farmer: true,
      },
      take: limit,
    })

    const smsProvider = getSMSProvider()
    let sent = 0
    let failed = 0

    for (const alert of queuedAlerts) {
      // Check farmer consent
      if (!alert.farmer.consent) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            status: AlertStatus.CANCELLED,
          },
        })
        continue
      }

      const message: SMSMessage = {
        to: alert.farmer.phone,
        message: alert.messageText,
        alertId: alert.id,
      }

      const result = await smsProvider.send(message)

      if (result.success) {
        sent++
      } else {
        failed++
        // Retry logic: mark as failed after 3 attempts
        if (alert.attempts >= 2) {
          await prisma.alert.update({
            where: { id: alert.id },
            data: {
              status: AlertStatus.FAILED,
            },
          })
        }
      }
    }

    return { sent, failed }
  }

  /**
   * Generate alerts for all active farmers (batch job)
   */
  async generateAlertsForAllActiveFarmers(): Promise<{ generated: number }> {
    const activeFarmers = await prisma.farmer.findMany({
      where: {
        consent: true,
        subscriptions: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
      },
    })

    let generated = 0

    for (const farmer of activeFarmers) {
      try {
        const alertIds = await this.generateAlertsForFarmer(farmer.id)
        generated += alertIds.length
      } catch (error) {
        console.error(`Error generating alerts for farmer ${farmer.id}:`, error)
      }
    }

    return { generated }
  }
}

export const alertEngine = new AlertEngine()




