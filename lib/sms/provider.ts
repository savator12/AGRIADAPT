import { prisma } from '../prisma'
import { AlertStatus } from '@prisma/client'

export interface SMSMessage {
  to: string
  message: string
  alertId?: string
}

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface SMSProvider {
  send(message: SMSMessage): Promise<SMSResult>
}

/**
 * Mock SMS Provider for development/testing
 * In production, replace with EthioTelecom or other gateway
 */
class MockSMSProvider implements SMSProvider {
  async send(message: SMSMessage): Promise<SMSResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      console.error(`[MockSMS] Failed to send to ${message.to}: Simulated failure`)
      return {
        success: false,
        error: 'Simulated provider failure',
      }
    }
    
    // Generate mock message ID
    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`[MockSMS] Sent to ${message.to}: ${message.message.substring(0, 50)}...`)
    console.log(`[MockSMS] Message ID: ${messageId}`)
    
    // Update alert status if alertId provided
    if (message.alertId) {
      await prisma.alert.update({
        where: { id: message.alertId },
        data: {
          status: AlertStatus.SENT,
          providerMessageId: messageId,
          lastAttemptAt: new Date(),
          attempts: {
            increment: 1,
          },
        },
      })
    }
    
    return {
      success: true,
      messageId,
    }
  }
}

/**
 * EthioTelecom SMS Provider (placeholder for production)
 */
class EthioTelecomProvider implements SMSProvider {
  private apiKey: string
  private apiUrl: string

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey
    this.apiUrl = apiUrl
  }

  async send(message: SMSMessage): Promise<SMSResult> {
    try {
      // TODO: Implement actual EthioTelecom API call
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: message.to,
          message: message.message,
        }),
      })

      if (!response.ok) {
        throw new Error(`SMS API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (message.alertId) {
        await prisma.alert.update({
          where: { id: message.alertId },
          data: {
            status: AlertStatus.SENT,
            providerMessageId: data.messageId,
            lastAttemptAt: new Date(),
            attempts: {
              increment: 1,
            },
          },
        })
      }

      return {
        success: true,
        messageId: data.messageId,
      }
    } catch (error: any) {
      if (message.alertId) {
        await prisma.alert.update({
          where: { id: message.alertId },
          data: {
            status: AlertStatus.FAILED,
            lastAttemptAt: new Date(),
            attempts: {
              increment: 1,
            },
          },
        })
      }

      return {
        success: false,
        error: error.message,
      }
    }
  }
}

/**
 * Get SMS provider based on environment
 */
export function getSMSProvider(): SMSProvider {
  const provider = process.env.SMS_PROVIDER || 'mock'
  
  if (provider === 'ethiotelecom') {
    const apiKey = process.env.ETHIO_TELECOM_API_KEY
    const apiUrl = process.env.ETHIO_TELECOM_API_URL
    
    if (!apiKey || !apiUrl) {
      throw new Error('EthioTelecom API credentials not configured')
    }
    
    return new EthioTelecomProvider(apiKey, apiUrl)
  }
  
  return new MockSMSProvider()
}




