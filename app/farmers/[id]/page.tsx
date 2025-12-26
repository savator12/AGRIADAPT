import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import FarmerProfile from '@/components/farmers/FarmerProfile'
import { prisma } from '@/lib/prisma'

export default async function FarmerDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth([UserRole.KEBELE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN])

  const farmer = await prisma.farmer.findUnique({
    where: { id: params.id },
    include: {
      kebele: {
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
      },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
      },
      advisories: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      alerts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!farmer) {
    redirect('/farmers')
  }

  // Check access
  if (user.role === UserRole.KEBELE_STAFF && user.kebeleId !== farmer.kebeleId) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <a href="/farmers" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                ← Back to Farmers
              </a>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Farmer Profile</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FarmerProfile farmer={farmer} user={user} />
      </div>
    </div>
  )
}



