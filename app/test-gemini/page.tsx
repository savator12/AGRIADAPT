'use client'

import { useState, useEffect } from 'react'

export default function TestGeminiPage() {
  const [language, setLanguage] = useState('am')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  
  const checkStatus = async () => {
    setCheckingStatus(true)
    try {
      const response = await fetch('/api/test/gemini-status')
      const data = await response.json()
      setStatus(data)
    } catch (err: any) {
      setStatus({ error: err.message })
    } finally {
      setCheckingStatus(false)
    }
  }
  
  // Check status on mount
  useEffect(() => {
    checkStatus()
  }, [])

  const testGemini = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/test/gemini?language=${language}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Test failed')
        setResult(null)
      } else {
        setResult(data)
        setError(null)
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Gemini API Test
          </h1>

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="test-language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Language:
              </label>
              <select
                id="test-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="am">አማርኛ (Amharic)</option>
                <option value="or">Afaan Oromoo (Oromo)</option>
                <option value="ti">ትግርኛ (Tigrigna)</option>
                <option value="en">English</option>
              </select>
            </div>

            <button
              onClick={testGemini}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg font-semibold"
            >
              {loading ? 'Testing Gemini API...' : 'Test Gemini API'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
                <p className="font-semibold">✓ Gemini API is working!</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{result.success ? 'Success' : 'Failed'}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">API Key Configured:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{result.configured ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Model:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{result.model || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Language:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{result.language} ({result.languageCode})</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Timestamp:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{result.timestamp}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Gemini Response:</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono text-sm">
                  {result.response}
                </div>
              </div>

              {result.prompt && (
                <details className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <summary className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                    View Prompt (click to expand)
                  </summary>
                  <div className="mt-2 bg-white dark:bg-gray-800 rounded p-3 text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono text-xs">
                    {result.prompt}
                  </div>
                </details>
              )}
            </div>
          )}

          {status && (
            <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">Configuration Status</h3>
                <button
                  onClick={checkStatus}
                  disabled={checkingStatus}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  {checkingStatus ? 'Checking...' : 'Refresh'}
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">API Key:</span>
                  <span className={status.apiKeyConfigured ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                    {status.apiKeyConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
                {status.apiKeyConfigured && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">API Key Valid:</span>
                      <span className={status.apiKeyValid === false ? 'text-red-600 dark:text-red-400 font-semibold' : status.apiKeyValid === true ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-yellow-600 dark:text-yellow-400'}>
                        {status.apiKeyValid === false ? 'Invalid/Expired' : status.apiKeyValid === true ? 'Valid' : 'Not Tested'}
                      </span>
                    </div>
                    {status.apiKeyValid === false && status.helpUrl && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <p className="font-semibold mb-1">Action Required:</p>
                        <p>Your API key is invalid or expired. Please:</p>
                        <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                          <li>Get a new API key from <a href={status.helpUrl} target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                          <li>Update GOOGLE_GEMINI_API_KEY in your .env.local file</li>
                          <li>Restart your development server</li>
                        </ol>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Model:</span>
                      <span className="text-gray-900 dark:text-white font-mono text-xs">{status.modelSelected || status.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Model Status:</span>
                      <span className={status.modelInitialized ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                        {status.modelInitialized ? 'Available' : 'Will use fallback'}
                      </span>
                    </div>
                  </>
                )}
                {status.modelError && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <p className="font-semibold">Error:</p>
                    <p>{status.modelError}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">How to use:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Check the configuration status above</li>
              <li>Select a language from the dropdown</li>
              <li>Click the Test Gemini API button</li>
              <li>Verify the response is in the selected language</li>
              <li>Check the browser console and server logs for detailed debugging</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

