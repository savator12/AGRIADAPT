'use client'

import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from 'react'

interface DashboardChartsProps {
  cropStats: Array<{ cropType: string | null; _count: number }>
  farmTypeStats: Array<{ farmType: string; _count: number }>
  waterAccessStats: Array<{ waterAccess: string; _count: number }>
  alertsByType: Array<{ type: string; _count: number }>
  alertsByStatus: Array<{ status: string; _count: number }>
  farmersChartData: Array<{ month: string; count: number }>
}

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

export default function DashboardCharts({
  cropStats,
  farmTypeStats,
  waterAccessStats,
  alertsByType,
  alertsByStatus,
  farmersChartData,
}: DashboardChartsProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    // Watch for changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    
    return () => observer.disconnect()
  }, [])

  const textColor = isDark ? '#e5e7eb' : '#111827'
  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const bgColor = isDark ? '#1f2937' : '#ffffff'

  // Prepare data for charts
  const cropChartData = cropStats
    .filter(s => s.cropType)
    .map(s => ({ name: s.cropType || 'Unknown', value: s._count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const farmTypeChartData = farmTypeStats.map(s => ({
    name: s.farmType.charAt(0) + s.farmType.slice(1).toLowerCase(),
    value: s._count,
  }))

  const waterAccessChartData = waterAccessStats.map(s => ({
    name: s.waterAccess.replace('_', ' ').toLowerCase(),
    value: s._count,
  }))

  const alertsTypeChartData = alertsByType.map(s => ({
    name: s.type.replace('_', ' ').toLowerCase(),
    value: s._count,
  }))

  const alertsStatusChartData = alertsByStatus.map(s => ({
    name: s.status.toLowerCase(),
    value: s._count,
  }))

  return (
    <>
      {/* Farmers by Crop Type - Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Farmers by Crop Type</h3>
        {cropChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cropChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fill: textColor }} />
              <YAxis tick={{ fill: textColor }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: bgColor, 
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }} 
              />
              <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            No crop type data available
          </div>
        )}
      </div>

      {/* Farm Type Distribution - Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Farm Type Distribution</h3>
        {farmTypeChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={farmTypeChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {farmTypeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: bgColor, 
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            No farm type data available
          </div>
        )}
      </div>

      {/* Water Access Distribution - Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Water Access Distribution</h3>
        {waterAccessChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={waterAccessChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {waterAccessChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: bgColor, 
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            No water access data available
          </div>
        )}
      </div>

      {/* Alerts by Type - Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alerts by Type</h3>
        {alertsTypeChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alertsTypeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fill: textColor }} />
              <YAxis tick={{ fill: textColor }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: bgColor, 
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }} 
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            No alert type data available
          </div>
        )}
      </div>

      {/* Alerts by Status - Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alerts by Status</h3>
        {alertsStatusChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={alertsStatusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {alertsStatusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: bgColor, 
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            No alert status data available
          </div>
        )}
      </div>

      {/* Farmers Registration Over Time - Line Chart */}
      {farmersChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Farmers Registration Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={farmersChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fill: textColor }} />
              <YAxis tick={{ fill: textColor }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: bgColor, 
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }} 
              />
              <Legend wrapperStyle={{ color: textColor }} />
              <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} name="Farmers Registered" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}
