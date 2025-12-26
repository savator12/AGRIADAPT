'use client'

import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from 'react'

interface AdminDashboardChartsProps {
  regionChartData: Array<{ name: string; value: number }>
  farmTypeStats: Array<{ farmType: string; _count: number }>
  alertsByType: Array<{ type: string; _count: number }>
  alertsStats: Array<{ status: string; _count: number }>
  usersByRole: Array<{ role: string; _count: number }>
  farmersChartData: Array<{ month: string; count: number }>
  topKebeles: Array<{ name: string; farmers: number; region: string }>
}

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6']

export default function AdminDashboardCharts({
  regionChartData,
  farmTypeStats,
  alertsByType,
  alertsStats,
  usersByRole,
  farmersChartData,
  topKebeles,
}: AdminDashboardChartsProps) {
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

  const farmTypeChartData = farmTypeStats.map(s => ({
    name: s.farmType.charAt(0) + s.farmType.slice(1).toLowerCase(),
    value: s._count,
  }))

  const alertsTypeChartData = alertsByType.map(s => ({
    name: s.type.replace('_', ' ').toLowerCase(),
    value: s._count,
  }))

  const alertsStatusChartData = alertsStats.map(s => ({
    name: s.status.toLowerCase(),
    value: s._count,
  }))

  const usersRoleChartData = usersByRole.map(s => ({
    name: s.role.replace('_', ' ').toLowerCase(),
    value: s._count,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Farmers by Region - Bar Chart */}
      {regionChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Farmers by Region</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionChartData}>
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
        </div>
      )}

      {/* Farm Type Distribution - Pie Chart */}
      {farmTypeChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Farm Type Distribution</h3>
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
        </div>
      )}

      {/* Alerts by Type - Bar Chart */}
      {alertsTypeChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alerts by Type</h3>
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
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alerts by Status - Pie Chart */}
      {alertsStatusChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alerts by Status</h3>
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
        </div>
      )}

      {/* Users by Role - Pie Chart */}
      {usersRoleChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Users by Role</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={usersRoleChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {usersRoleChartData.map((entry, index) => (
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
        </div>
      )}

      {/* Top Kebeles - Bar Chart */}
      {topKebeles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Kebeles by Farmers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topKebeles.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" tick={{ fill: textColor }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fill: textColor }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: bgColor, 
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }} 
              />
              <Bar dataKey="farmers" fill="#22c55e" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
    </div>
  )
}
