# Google Gemini AI Integration Setup

This application uses Google Gemini AI to generate personalized farming advisories in the farmer's preferred language and send them via SMS.

## Setup Instructions

### 1. Get a Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Add API Key to Environment Variables

Create a `.env.local` file in the root directory (or add to your existing `.env` file):

```env
GOOGLE_GEMINI_API_KEY=your-api-key-here

# Optional: Choose Gemini model (default: gemini-pro)
# Options: gemini-pro (stable, recommended), gemini-1.0-pro (alternative)
# Note: gemini-1.5 models may not be available in all regions
GEMINI_MODEL=gemini-pro
```

### 3. Restart Your Development Server

After adding the API key, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

### Advisory Generation

When a staff member generates an advisory for a farmer:

1. **Language Selection**: Staff can choose the language for the advisory (Amharic, Afaan Oromo, Tigrigna, or English) using the dropdown selector
2. **Rule-Based Analysis**: The system first analyzes weather data and farmer profile using rule-based logic
3. **AI Enhancement**: Gemini AI then generates a personalized advisory message in the selected language
4. **SMS Delivery**: If the farmer has given consent and has an active subscription, the advisory is automatically sent to their phone number via SMS in the same language

### Features

- **Language Selection**: Staff can choose the advisory language at generation time (defaults to farmer's preferred language)
- **Multi-language Support**: Advisories are generated in Amharic (አማርኛ), Afaan Oromo, Tigrigna (ትግርኛ), or English
- **Updated Gemini Models**: Uses `gemini-1.5-flash` by default (faster) or `gemini-1.5-pro` (better quality)
- **Cultural Context**: Gemini AI considers Ethiopian farming practices and cultural context
- **Personalized Messages**: Each advisory is tailored to the specific farmer's:
  - Crop type
  - Farm type
  - Soil type
  - Water access
  - Location
  - Weather conditions

### SMS Message Format

SMS messages are:
- Limited to 160 characters (standard SMS limit)
- Written in the farmer's preferred language
- Include the farmer's name
- Contain actionable advice
- End with "ET-SAFE" identifier

## API Usage

The Gemini integration is used in two places:

1. **Full Advisory Text** (`generateAdvisoryWithGemini`): Generates detailed advisory text for display in the web portal
2. **SMS Advisory** (`generateSMSAdvisoryWithGemini`): Generates short SMS-friendly messages

## Fallback Behavior

If the Gemini API key is not configured or if there's an error:
- The system falls back to rule-based English text generation
- Advisory generation continues to work
- SMS sending may fail if Gemini is required

## Testing

To test the integration:

1. Ensure you have a valid Gemini API key
2. Register a farmer with consent enabled
3. Generate an advisory for the farmer
4. Check that:
   - The advisory text is generated in the farmer's language
   - An SMS is sent to the farmer's phone number (if using mock SMS provider, check console logs)

## Troubleshooting

### "Gemini API key not configured" Warning

- Check that `GOOGLE_GEMINI_API_KEY` is set in your `.env.local` file
- Restart your development server after adding the key

### SMS Not Sending

- Verify the farmer has `consent: true` in the database
- Check that the farmer has an active subscription
- Review console logs for error messages
- Ensure SMS provider is configured (see `lib/sms/provider.ts`)

### Advisory Text Not in Correct Language

- Verify the farmer's `language` field is set correctly ('am', 'or', 'ti', or 'en')
- Check Gemini API response in console logs
- Ensure the API key has proper permissions

## Cost Considerations

Google Gemini API has free tier limits. Monitor your usage:
- Free tier: 60 requests per minute
- Check [Google AI Studio](https://makersuite.google.com/) for current pricing

## Security Notes

- Never commit your API key to version control
- Use environment variables for all sensitive configuration
- Rotate API keys regularly
- Monitor API usage for unusual activity

