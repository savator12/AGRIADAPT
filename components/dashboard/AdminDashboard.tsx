import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { subDays } from 'date-fns'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/ThemeToggle'
import AdminDashboardCharts from '@/components/dashboard/AdminDashboardCharts'

interface AdminDashboardProps {
  user: {
    id: string
    name: string
    email: string | null
    role: string
    kebeleId: string | null
  }
}

export default async function AdminDashboard({ user }: AdminDashboardProps) {
  const totalFarmers = await prisma.farmer.count()
  const totalKebeles = await prisma.kebele.count()
  const activeSubscriptions = await prisma.subscription.count({
    where: { status: 'ACTIVE' },
  })
  const totalUsers = await prisma.user.count()

  const alertsStats = await prisma.alert.groupBy({
    by: ['status'],
    _count: true,
  })

  const sentAlerts = alertsStats.find(s => s.status === 'SENT')?._count || 0
  const failedAlerts = alertsStats.find(s => s.status === 'FAILED')?._count || 0
  const totalAlerts = alertsStats.reduce((sum, stat) => sum + stat._count, 0)

  const kebeles = await prisma.kebele.findMany({
    include: {
      woreda: {
        include: {
          zone: {
            include: {
              region: true,
            },
          },
        },
      },
      _count: {
        select: {
          farmers: true,
        },
      },
    },
    take: 10,
  })

  // Statistics by region
  const farmersByRegion = await prisma.farmer.groupBy({
    by: ['kebeleId'],
    _count: true,
  })

  // Get kebele details for region grouping
  const kebeleDetails = await prisma.kebele.findMany({
    include: {
      woreda: {
        include: {
          zone: {
            include: {
              region: true,
            },
          },
        },
      },
    },
  })

  // Group by region
  const regionStats = kebeleDetails.reduce((acc, kebele) => {
    const regionName = kebele.woreda.zone.region.name
    const farmerCount = farmersByRegion.find(f => f.kebeleId === kebele.id)?._count || 0
    acc[regionName] = (acc[regionName] || 0) + farmerCount
    return acc
  }, {} as Record<string, number>)

  const regionChartData = Object.entries(regionStats).map(([name, value]) => ({
    name,
    value,
  }))

  // Farmers by farm type
  const farmTypeStats = await prisma.farmer.groupBy({
    by: ['farmType'],
    _count: true,
  })

  // Alerts by type
  const alertsByType = await prisma.alert.groupBy({
    by: ['type'],
    _count: true,
  })

  // Users by role
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
  })

  // Recent farmers (last 30 days)
  const thirtyDaysAgo = subDays(new Date(), 30)
  const recentFarmers = await prisma.farmer.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  })

  // Farmers over time (last 6 months)
  const sixMonthsAgo = subDays(new Date(), 180)
  const farmersOverTime = await prisma.farmer.findMany({
    where: {
      createdAt: {
        gte: sixMonthsAgo,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const farmersByMonth = farmersOverTime.reduce((acc, farmer) => {
    const month = new Date(farmer.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const farmersChartData = Object.entries(farmersByMonth).map(([month, count]) => ({
    month,
    count,
  }))

  // Top kebeles by farmer count
  const topKebeles = kebeles
    .map(k => ({
      name: k.name,
      farmers: k._count.farmers,
      region: k.woreda.zone.region.name,
    }))
    .sort((a, b) => b.farmers - a.farmers)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
                ET-SAFE Portal - Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{user.name}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 animate-fade-in">Admin Dashboard</h2>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Farmers</p>
                <p className="text-5xl font-bold mt-2">{totalFarmers}</p>
                <p className="text-blue-100 text-xs mt-3 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {recentFarmers} in last 30 days
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 group-hover:bg-white/30 transition-all">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Active Subscriptions</p>
                <p className="text-5xl font-bold mt-2">{activeSubscriptions}</p>
                <p className="text-green-100 text-xs mt-3 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {totalFarmers > 0 ? Math.round((activeSubscriptions / totalFarmers) * 100) : 0}% of farmers
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 group-hover:bg-white/30 transition-all">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Total Kebeles</p>
                <p className="text-5xl font-bold mt-2">{totalKebeles}</p>
                <p className="text-purple-100 text-xs mt-3 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Active kebeles
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 group-hover:bg-white/30 transition-all">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Alerts Sent</p>
                <p className="text-5xl font-bold mt-2">{sentAlerts}</p>
                <p className="text-orange-100 text-xs mt-3 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {totalAlerts > 0 ? Math.round((sentAlerts / totalAlerts) * 100) : 0}% success rate
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 group-hover:bg-white/30 transition-all">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <AdminDashboardCharts
          regionChartData={regionChartData}
          farmTypeStats={farmTypeStats}
          alertsByType={alertsByType}
          alertsStats={alertsStats}
          usersByRole={usersByRole}
          farmersChartData={farmersChartData}
          topKebeles={topKebeles}
        />

        {/* Kebele Comparison Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-8 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kebele Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kebele</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Woreda</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Zone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Farmers</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {kebeles.map((kebele) => (
                  <tr key={kebele.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {kebele.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {kebele.woreda.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {kebele.woreda.zone.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {kebele.woreda.zone.region.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {kebele._count.farmers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
