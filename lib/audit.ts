import { prisma } from './prisma'

export async function logAudit(
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  beforeJson?: any,
  afterJson?: any
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      beforeJson: beforeJson ? (beforeJson as any) : null,
      afterJson: afterJson ? (afterJson as any) : null,
    },
  })
}




