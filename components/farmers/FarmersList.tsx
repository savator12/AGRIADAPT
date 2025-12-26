'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Kebele {
  id: string
  name: string
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

interface Farmer {
  id: string
  fullName: string
  phone: string
  cropType: string | null
  farmType: string
  subscriptions: Array<{ id: string; status: string }>
  kebele: {
    name: string
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
}

interface FarmersListProps {
  user: {
    id: string
    role: string
    kebeleId: string | null
  }
  kebeles: Kebele[]
}

export default function FarmersList({ user, kebeles }: FarmersListProps) {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedKebele, setSelectedKebele] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchFarmers()
  }, [search, selectedKebele])

  const fetchFarmers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (selectedKebele) params.append('kebeleId', selectedKebele)

      const response = await fetch(`/api/farmers?${params.toString()}`)
      const data = await response.json()
      setFarmers(data.farmers || [])
    } catch (error) {
      console.error('Error fetching farmers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (selectedKebele) params.append('kebeleId', selectedKebele)

      const response = await fetch(`/api/farmers/export?${params.toString()}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `farmers_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Failed to export farmers')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 transition-colors"
          />
        </div>
        {user.role !== 'KEBELE_STAFF' && kebeles.length > 0 && (
          <select
            value={selectedKebele}
            onChange={(e) => setSelectedKebele(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 transition-colors"
          >
            <option value="">All Kebeles</option>
            {kebeles.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg transform hover:scale-105 font-semibold"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : farmers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No farmers found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crop Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {farmers.map((farmer) => (
                <tr key={farmer.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {farmer.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {farmer.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {farmer.kebele.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {farmer.cropType || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      farmer.subscriptions.length > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {farmer.subscriptions.length > 0 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/farmers/${farmer.id}`}
                      className="text-green-600 hover:text-green-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}



