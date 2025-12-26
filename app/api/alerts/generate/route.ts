import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { alertEngine } from '@/lib/sms/alert-engine'

export async function POST() {
  try {
    // Only allow admin/super admin to trigger manual generation
    await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN])
    
    const result = await alertEngine.generateAlertsForAllActiveFarmers()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('Error generating alerts:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}




