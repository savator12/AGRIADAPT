import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  
  const status = {
    apiKeyConfigured: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'not set',
    model: model,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }
  
  // Try to initialize Gemini if API key exists
  if (apiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(apiKey)
      
      // Try to get the model (this will fail if model doesn't exist)
      const ALLOWED_MODELS = new Set([
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-flash-latest',
        'gemini-pro-latest',
        'gemini-2.0-flash',
        'gemini-2.0-flash-001',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash-lite-001',
        'gemini-2.5-flash-lite',
      ])
      
      const selectedModel = ALLOWED_MODELS.has(model) ? model : 'gemini-2.5-flash'
      
      try {
        const testModel = genAI.getGenerativeModel({ model: selectedModel })
        
        // Try a simple test call to verify the API key works
        try {
          const testResult = await testModel.generateContent('test')
          await testResult.response
          
          return NextResponse.json({
            ...status,
            modelSelected: selectedModel,
            modelInitialized: true,
            apiKeyValid: true,
            message: 'Gemini API is properly configured and working',
          })
        } catch (testError: any) {
          const isApiKeyError = testError.message?.toLowerCase().includes('api key') ||
                               testError.message?.toLowerCase().includes('api_key') ||
                               testError.message?.toLowerCase().includes('expired') ||
                               testError.message?.toLowerCase().includes('invalid')
          
          if (isApiKeyError) {
            return NextResponse.json({
              ...status,
              modelSelected: selectedModel,
              modelInitialized: false,
              apiKeyValid: false,
              modelError: testError.message,
              message: 'API key is invalid or expired. Please check your .env.local file.',
              helpUrl: 'https://aistudio.google.com/app/apikey',
            })
          }
          
          return NextResponse.json({
            ...status,
            modelSelected: selectedModel,
            modelInitialized: true,
            apiKeyValid: true,
            testError: testError.message,
            message: 'Model initialized but test call failed',
          })
        }
      } catch (modelError: any) {
        const isApiKeyError = modelError.message?.toLowerCase().includes('api key') ||
                            modelError.message?.toLowerCase().includes('api_key') ||
                            modelError.message?.toLowerCase().includes('expired') ||
                            modelError.message?.toLowerCase().includes('invalid')
        
        return NextResponse.json({
          ...status,
          modelSelected: selectedModel,
          modelInitialized: false,
          apiKeyValid: !isApiKeyError,
          modelError: modelError.message,
          message: isApiKeyError 
            ? 'API key is invalid or expired. Please check your .env.local file.'
            : 'Model initialization failed - will use fallback',
          helpUrl: isApiKeyError ? 'https://aistudio.google.com/app/apikey' : undefined,
        })
      }
    } catch (importError: any) {
      return NextResponse.json({
        ...status,
        importError: importError.message,
        message: 'Failed to import Gemini SDK',
      }, { status: 500 })
    }
  }
  
  return NextResponse.json({
    ...status,
    message: 'API key not configured',
  })
}

