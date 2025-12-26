import { UserRole } from '@prisma/client'
import { getUserFromSession } from './auth'

export function hasRole(userRole: string, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole as UserRole)
}

export async function requireAuth(requiredRoles?: UserRole[]) {
  const user = await getUserFromSession()
  
  if (!user) {
    throw new Error('Unauthorized')
  }

  if (requiredRoles && !hasRole(user.role, requiredRoles)) {
    throw new Error('Forbidden')
  }

  return user
}

export function canAccessKebele(userKebeleId: string | null, targetKebeleId: string): boolean {
  // Super admin and admin can access all kebeles
  // Kebele staff can only access their own kebele
  return userKebeleId === null || userKebeleId === targetKebeleId
}




