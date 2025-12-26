import { redirect } from 'next/navigation'
import { getUserFromSession } from '@/lib/auth'
import { requireAuth } from '@/lib/rbac'
import KebeleDashboard from '@/components/dashboard/KebeleDashboard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard'
import { UserRole } from '@prisma/client'

export default async function DashboardPage() {
  const user = await requireAuth()

  if (user.role === UserRole.KEBELE_STAFF) {
    return <KebeleDashboard user={user} />
  } else if (user.role === UserRole.ADMIN) {
    return <AdminDashboard user={user} />
  } else if (user.role === UserRole.SUPER_ADMIN) {
    return <SuperAdminDashboard user={user} />
  }

  redirect('/login')
}




