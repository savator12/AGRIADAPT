'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LocationMap from '@/components/map/LocationMap'

interface Kebele {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
  woreda: {
    name: string
    zone: {
      name: string
      region: {
        name: string
      }
    }
  }
}

interface FarmerRegistrationFormProps {
  kebele: Kebele | null
  kebeles: Kebele[]
  userRole: string
}

export default function FarmerRegistrationForm({ kebele, kebeles, userRole }: FarmerRegistrationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [farmerId, setFarmerId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    language: 'am',
    kebeleName: kebele?.name || '',
    kebeleId: kebele?.id || '',
    latitude: kebele?.latitude?.toString() || '',
    longitude: kebele?.longitude?.toString() || '',
    farmType: 'CROP' as 'CROP' | 'LIVESTOCK' | 'MIXED',
    cropType: '',
    soilType: '',
    farmSizeHa: '',
    waterAccess: 'RAIN_FED' as 'RAIN_FED' | 'IRRIGATION' | 'MIXED',
    consent: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          kebeleName: formData.kebeleName, // Send kebele name instead of kebeleId
          kebeleId: userRole === 'KEBELE_STAFF' ? formData.kebeleId : undefined, // Only send kebeleId for staff
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          farmSizeHa: formData.farmSizeHa ? parseFloat(formData.farmSizeHa) : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to register farmer')
        setLoading(false)
        return
      }

      setFarmerId(data.farmer.id)
      setSuccess(true)
      setLoading(false)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (success && farmerId) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Farmer Registered Successfully!</h2>
          <p className="text-gray-600 mb-6">The farmer has been registered and a subscription has been created.</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/farmers/${farmerId}`)}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
            >
              View Farmer Profile
            </button>
            <button
              onClick={() => {
                setSuccess(false)
                setFormData({
                  fullName: '',
                  phone: '',
                  language: 'am',
                  kebeleName: kebele?.name || '',
                  kebeleId: kebele?.id || '',
                  latitude: kebele?.latitude?.toString() || '',
                  longitude: kebele?.longitude?.toString() || '',
                  farmType: 'CROP',
                  cropType: '',
                  soilType: '',
                  farmSizeHa: '',
                  waterAccess: 'RAIN_FED',
                  consent: false,
                })
              }}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Register Another Farmer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number (E.164) *
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            placeholder="+251911234567"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
          />
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Language *
          </label>
          <select
            id="language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
          >
            <option value="am">Amharic</option>
            <option value="or">Afaan Oromo</option>
            <option value="ti">Tigrigna</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Location</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="kebeleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Kebele Name *
          </label>
          <input
            id="kebeleName"
            type="text"
            value={formData.kebeleName}
            onChange={(e) => {
              // Remove common patterns like "kebele 01", "Kebele 01", etc.
              let cleanedValue = e.target.value
                .replace(/^kebele\s*\d+/i, '') // Remove "kebele 01" at start
                .replace(/\s*kebele\s*\d+/i, '') // Remove " kebele 01" anywhere
                .replace(/^\d+\s*kebele/i, '') // Remove "01 kebele" at start
                .replace(/\s+\d+\s*kebele/i, '') // Remove " 01 kebele" anywhere
                .trim()
              
              setFormData({
                ...formData,
                kebeleName: cleanedValue,
              })
            }}
            placeholder="Enter kebele name"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 transition-colors"
          />
          {userRole === 'KEBELE_STAFF' && kebele && (
            <input type="hidden" name="kebeleId" value={kebele.id} />
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Farm Location (Click on map to select)
          </label>
          <LocationMap
            latitude={formData.latitude ? parseFloat(formData.latitude) : null}
            longitude={formData.longitude ? parseFloat(formData.longitude) : null}
            onLocationChange={(lat, lng) => {
              setFormData({
                ...formData,
                latitude: lat.toString(),
                longitude: lng.toString(),
              })
            }}
            height="400px"
          />
          <p className="text-xs text-gray-500 mt-2">
            Click on the map to set the exact location of the farm. If not set, the kebele center will be used.
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Farm Details</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="farmType" className="block text-sm font-medium text-gray-700 mb-1">
            Farm Type *
          </label>
          <select
            id="farmType"
            value={formData.farmType}
            onChange={(e) => setFormData({ ...formData, farmType: e.target.value as any })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
          >
            <option value="CROP">Crop</option>
            <option value="LIVESTOCK">Livestock</option>
            <option value="MIXED">Mixed</option>
          </select>
        </div>

        <div>
          <label htmlFor="cropType" className="block text-sm font-medium text-gray-700 mb-1">
            Crop/Seed Type
          </label>
          <input
            id="cropType"
            type="text"
            value={formData.cropType}
            onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
            placeholder="e.g., teff, maize, wheat"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
          />
        </div>

        <div>
          <label htmlFor="soilType" className="block text-sm font-medium text-gray-700 mb-1">
            Soil Type
          </label>
          <select
            id="soilType"
            value={formData.soilType}
            onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
          >
            <option value="">Select soil type</option>
            <option value="clay">Clay</option>
            <option value="loam">Loam</option>
            <option value="sand">Sand</option>
            <option value="black soil">Black Soil</option>
          </select>
        </div>

        <div>
          <label htmlFor="farmSizeHa" className="block text-sm font-medium text-gray-700 mb-1">
            Farm Size (hectares)
          </label>
          <input
            id="farmSizeHa"
            type="number"
            step="0.1"
            min="0"
            value={formData.farmSizeHa}
            onChange={(e) => setFormData({ ...formData, farmSizeHa: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
          />
        </div>

        <div>
          <label htmlFor="waterAccess" className="block text-sm font-medium text-gray-700 mb-1">
            Water Access *
          </label>
          <select
            id="waterAccess"
            value={formData.waterAccess}
            onChange={(e) => setFormData({ ...formData, waterAccess: e.target.value as any })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
          >
            <option value="RAIN_FED">Rain-fed</option>
            <option value="IRRIGATION">Irrigation</option>
            <option value="MIXED">Mixed</option>
          </select>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Consent</h3>
      </div>

      <div className="flex items-start">
        <input
          id="consent"
          type="checkbox"
          checked={formData.consent}
          onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
          required
          className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
        <label htmlFor="consent" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          I consent to receive SMS alerts and agree to data usage for climate-smart advisory services. *
        </label>
      </div>

      <div className="flex space-x-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-105 font-semibold"
        >
          {loading ? 'Registering...' : 'Register Farmer'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}



