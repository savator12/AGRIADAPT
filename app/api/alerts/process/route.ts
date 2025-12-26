import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { alertEngine } from '@/lib/sms/alert-engine'

export async function POST() {
  try {
    // Only allow admin/super admin to trigger manual processing
    await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN])
    
    const result = await alertEngine.processQueuedAlerts(100)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('Error processing alerts:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}




