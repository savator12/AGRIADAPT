import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import FarmersList from '@/components/farmers/FarmersList'
import { prisma } from '@/lib/prisma'

export default async function FarmersPage() {
  const user = await requireAuth([UserRole.KEBELE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN])

  // Get kebeles for admin/super admin
  const kebeles = user.role !== UserRole.KEBELE_STAFF
    ? await prisma.kebele.findMany({
        select: {
          id: true,
          name: true,
          woreda: {
            select: {
              name: true,
              zone: {
                select: {
                  name: true,
                  region: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Back to Dashboard
              </a>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Farmers</h1>
            </div>
            <a
              href="/farmers/new"
              className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 font-semibold"
            >
              Register New Farmer
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FarmersList user={user} kebeles={kebeles} />
      </div>
    </div>
  )
}



