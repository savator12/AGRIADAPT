import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_GEMINI_API_KEY

if (!apiKey) {
  console.warn('Warning: GOOGLE_GEMINI_API_KEY not set. Gemini features will be disabled.')
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

// Prefer Flash for speed/cost. You can override in .env.local
// Recommended values (from your ListModels output):
// gemini-2.5-flash | gemini-2.5-pro | gemini-flash-latest | gemini-pro-latest | gemini-2.0-flash
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Hard-allow only models you know exist (based on your pasted ListModels)
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
  // safe fallback
  return 'gemini-2.5-flash'
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function isRateLimitError(err: any) {
  const msg = String(err?.message || '')
  return msg.includes('429') || 
         msg.toLowerCase().includes('quota') || 
         msg.toLowerCase().includes('rate') ||
         msg.toLowerCase().includes('too many requests') ||
         msg.toLowerCase().includes('exceeded')
}

function isQuotaExceededError(err: any) {
  const msg = String(err?.message || '')
  return msg.toLowerCase().includes('exceeded your current quota') ||
         msg.toLowerCase().includes('quota exceeded') ||
         (msg.includes('429') && msg.toLowerCase().includes('quota'))
}

function isApiKeyError(err: any) {
  const msg = String(err?.message || '')
  return msg.toLowerCase().includes('api key') ||
         msg.toLowerCase().includes('api_key') ||
         msg.toLowerCase().includes('api key expired') ||
         msg.toLowerCase().includes('api key invalid') ||
         msg.toLowerCase().includes('api_key_invalid') ||
         msg.toLowerCase().includes('invalid api key') ||
         msg.includes('401') ||
         msg.includes('403')
}

function isNotFoundModelError(err: any) {
  const msg = String(err?.message || '')
  return msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('is not found')
}

async function generateWithRetry(model: any, prompt: string, opts?: { maxRetries?: number }) {
  const maxRetries = opts?.maxRetries ?? 4

  let attempt = 0
  let delay = 2000 // Start with 2 seconds for rate limits

  while (true) {
    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (err: any) {
      attempt++

      // Check if it's an API key error (don't retry these)
      if (isApiKeyError(err)) {
        console.error('[Gemini] API key error - not retrying')
        throw new Error(
          'Gemini API key is invalid or expired. Please check your API key in .env.local file. ' +
          'Get a new API key from https://aistudio.google.com/app/apikey'
        )
      }

      // Check if it's a quota exceeded error (don't retry these)
      if (isQuotaExceededError(err)) {
        console.error('[Gemini] Quota exceeded - not retrying')
        throw new Error(
          'Gemini API quota exceeded. Please check your billing and quota limits at https://ai.dev/usage?tab=rate-limit. ' +
          'You may need to upgrade your plan or wait for the quota to reset.'
        )
      }

      // Retry on rate limit errors (429) with exponential backoff
      if (isRateLimitError(err) && attempt <= maxRetries) {
        console.warn(`[Gemini] Rate limit hit (429). Retry ${attempt}/${maxRetries} after ${delay}ms`)
        await sleep(delay)
        // Exponential backoff: 2s, 4s, 8s, 16s (max 30s)
        delay = Math.min(delay * 2, 30000)
        continue
      }

      throw err
    }
  }
}

interface FarmerInfo {
  fullName: string
  phone: string
  language: string
  cropType: string | null
  farmType: string
  soilType: string | null
  waterAccess: string
  farmSizeHa: number | null
  location: string
}

interface WeatherInfo {
  avgRainfall: number
  maxTemp: number
  minTemp: number
  next7Days: {
    rainfallProb: number
    rainfallMm: number
  }
  droughtRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  floodRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  heatRisk: 'LOW' | 'MEDIUM' | 'HIGH'
}

interface AdvisoryRecommendations {
  ruleName: string
  actions: string[]
  explanation: string
  priority: number
}

const languageMap: Record<string, string> = {
  am: 'Amharic',
  or: 'Afaan Oromo',
  ti: 'Tigrigna',
  en: 'English',
}

const languageInstructions: Record<string, string> = {
  am: `Write ENTIRELY in Amharic using Ge'ez script (አማርኛ). Example greeting: "ሰላም"`,
  or: `Write ENTIRELY in Afaan Oromo using Latin script. Example greeting: "Akkam"`,
  ti: `Write ENTIRELY in Tigrigna using Ge'ez script (ትግርኛ). Example greeting: "ሰላም"`,
  en: `Write in English.`,
}

export async function generateAdvisoryWithGemini(
  farmerInfo: FarmerInfo,
  weatherInfo: WeatherInfo,
  recommendations: AdvisoryRecommendations[],
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH',
  language?: string
): Promise<string> {
  if (!genAI) throw new Error('Gemini API key not configured')

  const targetLanguage = language || farmerInfo.language
  const languageName = languageMap[targetLanguage] || targetLanguage
  const langInstruction = languageInstructions[targetLanguage] || languageInstructions.en

  const recText = recommendations
    .sort((a, b) => a.priority - b.priority)
    .map((rec, idx) => {
      const actions = rec.actions.map(a => `- ${a}`).join('\n')
      return `${idx + 1}. ${rec.ruleName}\n${actions}\nReason: ${rec.explanation}`
    })
    .join('\n\n')

  // Pick a safe model
  let modelName = pickModel(GEMINI_MODEL)
  let model = genAI.getGenerativeModel({ model: modelName })
  console.log(`[Gemini] Using model: ${modelName} (requested: ${GEMINI_MODEL})`)

  const prompt = `You are an agricultural advisor for Ethiopian farmers.

LANGUAGE (STRICT):
${langInstruction}
The ENTIRE message must be in ${languageName}. Do NOT mix languages.

Farmer:
- Name: ${farmerInfo.fullName}
- Location: ${farmerInfo.location}
- Crop: ${farmerInfo.cropType || 'Not specified'}
- Farm type: ${farmerInfo.farmType}
- Soil: ${farmerInfo.soilType || 'Not specified'}
- Water access: ${farmerInfo.waterAccess}
- Size: ${farmerInfo.farmSizeHa ? `${farmerInfo.farmSizeHa} hectares` : 'Not specified'}

Weather:
- Avg rainfall: ${weatherInfo.avgRainfall.toFixed(1)}mm
- Temp: ${weatherInfo.minTemp}°C - ${weatherInfo.maxTemp}°C
- Next 7 days: ${weatherInfo.next7Days.rainfallMm.toFixed(1)}mm (${Math.round(weatherInfo.next7Days.rainfallProb * 100)}% chance)
- Drought: ${weatherInfo.droughtRisk}
- Flood: ${weatherInfo.floodRisk}
- Heat: ${weatherInfo.heatRisk}

Overall risk: ${overallRisk}

Recommendations:
${recText}

Requirements:
- 200–300 words
- Simple & practical
- Urgent items first
- Greet the farmer by name
- End with encouragement
- Output ONLY in ${languageName}

Generate now:`

  try {
    const text = await generateWithRetry(model, prompt, { maxRetries: 4 })
    return text.trim()
  } catch (err: any) {
    // If the chosen model is suddenly not available, fallback to gemini-flash-latest
    if (isNotFoundModelError(err) && modelName !== 'gemini-flash-latest') {
      console.warn(`[Gemini] Model ${modelName} not found. Falling back to gemini-flash-latest`)
      modelName = 'gemini-flash-latest'
      model = genAI.getGenerativeModel({ model: modelName })
      const text = await generateWithRetry(model, prompt, { maxRetries: 4 })
      return text.trim()
    }
    throw new Error(`Failed to generate advisory: ${err?.message || String(err)}`)
  }
}

export async function generateSMSAdvisoryWithGemini(
  farmerInfo: FarmerInfo,
  weatherInfo: WeatherInfo,
  recommendations: AdvisoryRecommendations[],
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH',
  language?: string
): Promise<string> {
  if (!genAI) throw new Error('Gemini API key not configured')

  const targetLanguage = language || farmerInfo.language
  const languageName = languageMap[targetLanguage] || targetLanguage
  const langInstruction = languageInstructions[targetLanguage] || languageInstructions.en

  // Take top 2 actions only (SMS)
  const top = recommendations
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 2)
    .map(r => (r.actions?.[0] || r.ruleName))
    .filter(Boolean)

  let modelName = pickModel(GEMINI_MODEL)
  let model = genAI.getGenerativeModel({ model: modelName })
  console.log(`[Gemini SMS] Using model: ${modelName} (requested: ${GEMINI_MODEL})`)

  // IMPORTANT: one call only. Force <=160 chars.
  const prompt = `Create ONE SMS only.

LANGUAGE (STRICT):
${langInstruction}
Write ONLY in ${languageName}. Do NOT mix languages.
Keep it <= 160 characters total (HARD LIMIT).

Must include:
- Greeting
- Farmer name: ${farmerInfo.fullName}
- 1–2 actions (short)
- End exactly with: ET-SAFE

Context:
Risk: ${overallRisk}
Weather next 7d: ${weatherInfo.next7Days.rainfallMm.toFixed(0)}mm, ${weatherInfo.minTemp}-${weatherInfo.maxTemp}C
Actions: ${top.join(' / ')}

Return ONLY the SMS text, nothing else:`

  try {
    let text = await generateWithRetry(model, prompt, { maxRetries: 3 })
    text = text.trim()
    
    // Hard limit to 160 chars
    if (text.length > 160) {
      text = text.substring(0, 157) + '...'
    }
    
    console.log(`[Gemini SMS] Generated SMS (${text.length} chars): ${text}`)
    return text
  } catch (err: any) {
    // If quota exceeded, don't try fallback - just throw the error
    if (isQuotaExceededError(err)) {
      throw err
    }
    
    // If model not found, try fallback
    if (isNotFoundModelError(err) && modelName !== 'gemini-flash-latest') {
      console.warn(`[Gemini SMS] Model ${modelName} not found. Falling back to gemini-flash-latest`)
      modelName = 'gemini-flash-latest'
      model = genAI.getGenerativeModel({ model: modelName })
      try {
        let text = await generateWithRetry(model, prompt, { maxRetries: 3 })
        text = text.trim()
        if (text.length > 160) {
          text = text.substring(0, 157) + '...'
        }
        return text
      } catch (fallbackErr: any) {
        // If fallback also fails with quota, throw that error
        if (isQuotaExceededError(fallbackErr)) {
          throw fallbackErr
        }
        throw new Error(`Failed to generate SMS advisory with fallback model: ${fallbackErr?.message || String(fallbackErr)}`)
      }
    }
    throw new Error(`Failed to generate SMS advisory: ${err?.message || String(err)}`)
  }
}
