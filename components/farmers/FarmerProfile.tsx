'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'

interface FarmerProfileProps {
  farmer: any
  user: {
    id: string
    role: string
  }
}

export default function FarmerProfile({ farmer, user }: FarmerProfileProps) {
  const [generatingAdvisory, setGeneratingAdvisory] = useState(false)
  const [advisoryError, setAdvisoryError] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(farmer.language || 'am')

  const handleGenerateAdvisory = async () => {
    setGeneratingAdvisory(true)
    setAdvisoryError('')

    try {
      const response = await fetch(`/api/advisory/generate?farmerId=${farmer.id}&language=${selectedLanguage}`, {
        method: 'POST',
      })

          const data = await response.json()

          if (!response.ok) {
            // Check if it's an API key error
            if (data.apiKeyInvalid || response.status === 401 || response.status === 403) {
              setAdvisoryError(
                'Gemini API key is invalid or expired. ' +
                'Please check your GOOGLE_GEMINI_API_KEY in .env.local file. ' +
                (data.helpUrl ? `Get a new key: ${data.helpUrl}` : 'https://aistudio.google.com/app/apikey')
              )
            } 
            // Check if it's a quota error
            else if (data.quotaExceeded || response.status === 429) {
              setAdvisoryError(
                'Gemini API quota exceeded. The advisory was not generated. ' +
                'Please check your API quota limits or wait for the quota to reset. ' +
                (data.helpUrl ? `More info: ${data.helpUrl}` : '')
              )
            } else {
              setAdvisoryError(data.error || 'Failed to generate advisory')
            }
            setGeneratingAdvisory(false)
            return
          }

      // Refresh page to show new advisory
      window.location.reload()
    } catch (error) {
      setAdvisoryError('An error occurred. Please try again.')
      setGeneratingAdvisory(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Farmer Card - Print Friendly */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 print:shadow-none transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{farmer.fullName}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Farmer ID: {farmer.id.substring(0, 8)}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 print:hidden transition-all shadow-md hover:shadow-lg transform hover:scale-105 font-semibold"
          >
            Print Card
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{farmer.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {farmer.kebele.name}, {farmer.kebele.woreda.name}, {farmer.kebele.woreda.zone.name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Farm Type</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{farmer.farmType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Crop Type</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{farmer.cropType || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Water Access</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{farmer.waterAccess}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Consent Status</p>
            <p className={`text-lg font-medium ${farmer.consent ? 'text-green-600' : 'text-red-600'}`}>
              {farmer.consent ? 'Consented' : 'No Consent'}
            </p>
          </div>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscriptions</h3>
        {farmer.subscriptions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No active subscriptions</p>
        ) : (
          <div className="space-y-2">
            {farmer.subscriptions.map((sub: any) => (
              <div key={sub.id} className="border-l-4 border-green-500 dark:border-green-400 pl-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-r-lg transition-colors">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">{sub.plan} Plan</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {sub.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Started: {format(new Date(sub.startDate), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advisories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advisories</h3>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <label htmlFor="advisory-language" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Language:
              </label>
              <select
                id="advisory-language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={generatingAdvisory}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 transition-colors text-sm font-medium"
                title="Select the language for the advisory"
              >
                <option value="am">አማርኛ (Amharic)</option>
                <option value="or">Afaan Oromoo (Oromo)</option>
                <option value="ti">ትግርኛ (Tigrigna)</option>
                <option value="en">English</option>
              </select>
            </div>
            <button
              onClick={handleGenerateAdvisory}
              disabled={generatingAdvisory}
              className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg transform hover:scale-105 font-semibold whitespace-nowrap"
            >
              {generatingAdvisory ? 'Generating...' : 'Generate Advisory'}
            </button>
          </div>
        </div>

        {advisoryError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {advisoryError}
          </div>
        )}

        {farmer.advisories.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No advisories generated yet</p>
        ) : (
          <div className="space-y-4">
            {farmer.advisories.map((advisory: any) => (
              <div key={advisory.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-gray-50 dark:bg-gray-700/50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {format(new Date(advisory.generatedAt), 'MMM d, yyyy HH:mm')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Risk: {advisory.riskSummaryJson?.overallRisk || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  {advisory.renderedText}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alert History</h3>
        {farmer.alerts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No alerts sent yet</p>
        ) : (
          <div className="space-y-3">
            {farmer.alerts.map((alert: any) => (
              <div key={alert.id} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-r-lg transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{alert.type.replace('_', ' ')}</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                      alert.severity === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    alert.status === 'SENT' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    alert.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {alert.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{alert.messageText}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {format(new Date(alert.createdAt), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



