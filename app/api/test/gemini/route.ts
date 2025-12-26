import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await requireAuth([UserRole.KEBELE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN])
    
    const searchParams = request.nextUrl.searchParams
    const language = searchParams.get('language') || 'am'
    const testText = searchParams.get('test') || 'Hello, this is a test message'

    // Test Gemini API
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_GEMINI_API_KEY not configured',
        configured: false,
      })
    }

    // Declare modelName outside try block so it's accessible in catch
    let modelName = 'gemini-2.5-flash'
    let genAI: any = null
    
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
      
      // Use the same model selection logic as the main code
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
      
      function pickModel(requested: string): string {
        if (ALLOWED_MODELS.has(requested)) return requested
        return 'gemini-2.5-flash'
      }
      
      modelName = pickModel(process.env.GEMINI_MODEL || 'gemini-2.5-flash')
      const model = genAI.getGenerativeModel({ model: modelName })
      
      console.log(`[Test Gemini] Using model: ${modelName}`)

      const languageMap: Record<string, string> = {
        'am': 'Amharic',
        'or': 'Afaan Oromo',
        'ti': 'Tigrigna',
        'en': 'English',
      }

      const languageName = languageMap[language] || language

      const prompt = `Write a short greeting message in ${languageName} language. 
      
Language requirements:
${language === 'am' ? 'Write in Amharic using Ge\'ez script (አማርኛ). Example: "ሰላም"' : ''}
${language === 'or' ? 'Write in Afaan Oromo using Latin script. Example: "Akkam"' : ''}
${language === 'ti' ? 'Write in Tigrigna using Ge\'ez script (ትግርኛ). Example: "ሰላም"' : ''}
${language === 'en' ? 'Write in English.' : ''}

Write ONLY in ${languageName}. Do not mix languages.`

      // Add retry logic for rate limits
      let text: string = ''
      let attempts = 0
      const maxAttempts = 3
      
      while (attempts < maxAttempts) {
        try {
          const result = await model.generateContent(prompt)
          const response = await result.response
          text = response.text()
          break
        } catch (err: any) {
          attempts++
          const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('quota')
          
          if (isRateLimit && attempts < maxAttempts) {
            const delay = 1000 * attempts
            console.warn(`[Test Gemini] Rate limit hit, retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          throw err
        }
      }
      
      if (!text) {
        throw new Error('Failed to generate content after retries')
      }

      return NextResponse.json({
        success: true,
        configured: true,
        language: languageName,
        languageCode: language,
        prompt: prompt.substring(0, 200) + '...',
        response: text,
        model: modelName,
        requestedModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      console.error('[Test Gemini] API Error:', error)
      
      // Try fallback model if 404
      const isNotFound = error.message?.includes('404') || 
                        error.message?.includes('not found') || 
                        error.message?.includes('is not found')
      
      if (isNotFound && modelName !== 'gemini-flash-latest' && genAI) {
        try {
          console.warn(`[Test Gemini] Model ${modelName} not found, trying gemini-flash-latest`)
          const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
          const result = await fallbackModel.generateContent(prompt)
          const response = await result.response
          const text = response.text()
          
          return NextResponse.json({
            success: true,
            configured: true,
            language: languageName,
            languageCode: language,
            prompt: prompt.substring(0, 200) + '...',
            response: text,
            model: 'gemini-flash-latest',
            requestedModel: modelName,
            fallback: true,
            timestamp: new Date().toISOString(),
          })
        } catch (fallbackError: any) {
          console.error('[Test Gemini] Fallback also failed:', fallbackError)
        }
      }
      
      return NextResponse.json({
        success: false,
        configured: true,
        error: error.message,
        details: error.toString(),
        model: modelName,
        isNotFoundError: isNotFound,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Authentication required',
    }, { status: 401 })
  }
}

