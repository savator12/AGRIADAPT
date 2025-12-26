import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/ThemeToggle'
import DashboardCharts from '@/components/dashboard/DashboardCharts'

interface KebeleDashboardProps {
  user: {
    id: string
    name: string
    email: string | null
    role: string
    kebeleId: string | null
  }
}

export default async function KebeleDashboard({ user }: KebeleDashboardProps) {
  if (!user.kebeleId) {
    return (
      <div className="p-8 dark:bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Dashboard</h1>
        <p className="text-red-600 dark:text-red-400">No kebele assigned to your account.</p>
      </div>
    )
  }

  const kebele = await prisma.kebele.findUnique({
    where: { id: user.kebeleId },
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

  const farmers = await prisma.farmer.findMany({
    where: { kebeleId: user.kebeleId },
    include: {
      subscriptions: {
        where: { status: 'ACTIVE' },
      },
      advisories: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const totalFarmers = await prisma.farmer.count({
    where: { kebeleId: user.kebeleId },
  })

  const activeSubscriptions = await prisma.subscription.count({
    where: {
      farmer: { kebeleId: user.kebeleId },
      status: 'ACTIVE',
    },
  })

  const totalAlerts = await prisma.alert.count({
    where: {
      farmer: { kebeleId: user.kebeleId },
    },
  })

  const sentAlerts = await prisma.alert.count({
    where: {
      farmer: { kebeleId: user.kebeleId },
      status: 'SENT',
    },
  })

  const recentAlerts = await prisma.alert.findMany({
    where: {
      farmer: { kebeleId: user.kebeleId },
    },
    include: {
      farmer: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Statistics by crop type
  const cropStats = await prisma.farmer.groupBy({
    by: ['cropType'],
    where: { kebeleId: user.kebeleId },
    _count: true,
  })

  // Statistics by farm type
  const farmTypeStats = await prisma.farmer.groupBy({
    by: ['farmType'],
    where: { kebeleId: user.kebeleId },
    _count: true,
  })

  // Statistics by water access
  const waterAccessStats = await prisma.farmer.groupBy({
    by: ['waterAccess'],
    where: { kebeleId: user.kebeleId },
    _count: true,
  })

  // Farmers registered in last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30)
  const recentFarmers = await prisma.farmer.count({
    where: {
      kebeleId: user.kebeleId,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  })

  // Alerts by type
  const alertsByType = await prisma.alert.groupBy({
    by: ['type'],
    where: {
      farmer: { kebeleId: user.kebeleId },
    },
    _count: true,
  })

  // Alerts by status
  const alertsByStatus = await prisma.alert.groupBy({
    by: ['status'],
    where: {
      farmer: { kebeleId: user.kebeleId },
    },
    _count: true,
  })

  // Farmers registered over time (last 6 months)
  const sixMonthsAgo = subDays(new Date(), 180)
  const farmersOverTime = await prisma.farmer.findMany({
    where: {
      kebeleId: user.kebeleId,
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

  // Prepare chart data
  const farmersByMonth = farmersOverTime.reduce((acc, farmer) => {
    const month = format(new Date(farmer.createdAt), 'MMM yyyy')
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const farmersChartData = Object.entries(farmersByMonth).map(([month, count]) => ({
    month,
    count,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent dark:from-green-400 dark:to-blue-400">
                ET-SAFE Portal
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
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kebele Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {kebele?.name}, {kebele?.woreda.name}, {kebele?.woreda.zone.name}, {kebele?.woreda.zone.region.name}
          </p>
        </div>

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
                <p className="text-purple-100 text-sm font-medium mb-1">Alerts Sent</p>
                <p className="text-5xl font-bold mt-2">{sentAlerts}</p>
                <p className="text-purple-100 text-xs mt-3 flex items-center">
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

          <div className="group bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Total Alerts</p>
                <p className="text-5xl font-bold mt-2">{totalAlerts}</p>
                <p className="text-orange-100 text-xs mt-3 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  All time alerts
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 group-hover:bg-white/30 transition-all">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <DashboardCharts
            cropStats={cropStats}
            farmTypeStats={farmTypeStats}
            waterAccessStats={waterAccessStats}
            alertsByType={alertsByType}
            alertsByStatus={alertsByStatus}
            farmersChartData={farmersChartData}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Link
                href="/farmers/new"
                className="flex items-center justify-center w-full bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Register New Farmer
              </Link>
              <Link
                href="/farmers"
                className="flex items-center justify-center w-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                View All Farmers
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Farm Type Distribution</h3>
            <div className="space-y-3">
              {farmTypeStats.map((stat) => {
                const percentage = totalFarmers > 0 ? Math.round((stat._count / totalFarmers) * 100) : 0
                return (
                  <div key={stat.farmType}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300 capitalize font-medium">{stat.farmType.toLowerCase()}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{stat._count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Farmers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700 transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Farmers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Crop Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {farmers.map((farmer) => (
                  <tr key={farmer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {farmer.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {farmer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {farmer.cropType || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        farmer.subscriptions.length > 0
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {farmer.subscriptions.length > 0 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/farmers/${farmer.id}`}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-semibold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-r-lg transition-colors">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">{alert.farmer.fullName}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    alert.status === 'SENT' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    alert.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {alert.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{alert.messageText.substring(0, 100)}...</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {format(new Date(alert.createdAt), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
