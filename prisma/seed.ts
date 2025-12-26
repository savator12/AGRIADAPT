import { PrismaClient, UserRole, FarmType, WaterAccess, SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Regions
  const oromia = await prisma.region.upsert({
    where: { name: 'Oromia' },
    update: {},
    create: {
      name: 'Oromia',
      code: 'OR',
    },
  })

  const amhara = await prisma.region.upsert({
    where: { name: 'Amhara' },
    update: {},
    create: {
      name: 'Amhara',
      code: 'AM',
    },
  })

  // Create Zones
  const eastShoa = await prisma.zone.upsert({
    where: {
      regionId_name: {
        regionId: oromia.id,
        name: 'East Shoa',
      },
    },
    update: {},
    create: {
      name: 'East Shoa',
      code: 'ES',
      regionId: oromia.id,
    },
  })

  const northShoa = await prisma.zone.upsert({
    where: {
      regionId_name: {
        regionId: amhara.id,
        name: 'North Shoa',
      },
    },
    update: {},
    create: {
      name: 'North Shoa',
      code: 'NS',
      regionId: amhara.id,
    },
  })

  // Create Woredas
  const adamaWoreda = await prisma.woreda.upsert({
    where: {
      zoneId_name: {
        zoneId: eastShoa.id,
        name: 'Adama',
      },
    },
    update: {},
    create: {
      name: 'Adama',
      code: 'AD',
      zoneId: eastShoa.id,
    },
  })

  const debreBirhanWoreda = await prisma.woreda.upsert({
    where: {
      zoneId_name: {
        zoneId: northShoa.id,
        name: 'Debre Birhan',
      },
    },
    update: {},
    create: {
      name: 'Debre Birhan',
      code: 'DB',
      zoneId: northShoa.id,
    },
  })

  // Create Kebeles
  const kebele1 = await prisma.kebele.upsert({
    where: {
      woredaId_name: {
        woredaId: adamaWoreda.id,
        name: 'Kebele 01',
      },
    },
    update: {},
    create: {
      name: 'Kebele 01',
      code: 'K01',
      woredaId: adamaWoreda.id,
      latitude: 8.5464,
      longitude: 39.2684,
    },
  })

  const kebele2 = await prisma.kebele.upsert({
    where: {
      woredaId_name: {
        woredaId: debreBirhanWoreda.id,
        name: 'Kebele 02',
      },
    },
    update: {},
    create: {
      name: 'Kebele 02',
      code: 'K02',
      woredaId: debreBirhanWoreda.id,
      latitude: 9.6796,
      longitude: 39.5326,
    },
  })

  // Create Users
  const passwordHash = await hashPassword('password123')

  const kebeleStaff1 = await prisma.user.upsert({
    where: { email: 'staff@kebele1.gov.et' },
    update: {},
    create: {
      name: 'Kebele Staff 1',
      email: 'staff@kebele1.gov.et',
      passwordHash,
      role: UserRole.KEBELE_STAFF,
      kebeleId: kebele1.id,
    },
  })

  const kebeleStaff2 = await prisma.user.upsert({
    where: { email: 'staff@kebele2.gov.et' },
    update: {},
    create: {
      name: 'Kebele Staff 2',
      email: 'staff@kebele2.gov.et',
      passwordHash,
      role: UserRole.KEBELE_STAFF,
      kebeleId: kebele2.id,
    },
  })

  const adminPasswordHash = await hashPassword('admin123')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@woreda.gov.et' },
    update: {},
    create: {
      name: 'Woreda Admin',
      email: 'admin@woreda.gov.et',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  })

  const superAdminPasswordHash = await hashPassword('superadmin123')
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@et-safe.gov.et' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@et-safe.gov.et',
      passwordHash: superAdminPasswordHash,
      role: UserRole.SUPER_ADMIN,
    },
  })

  // Create Farmers
  const farmers = []
  const cropTypes = ['teff', 'maize', 'wheat', 'sorghum', 'barley']
  const soilTypes = ['clay', 'loam', 'sand', 'black soil']

  for (let i = 1; i <= 10; i++) {
    const kebele = i <= 5 ? kebele1 : kebele2
    const farmer = await prisma.farmer.create({
      data: {
        fullName: `Farmer ${i}`,
        phone: `+2519112345${String(i).padStart(2, '0')}`,
        language: i % 2 === 0 ? 'am' : 'or',
        kebeleId: kebele.id,
        latitude: kebele.latitude! + (Math.random() - 0.5) * 0.1,
        longitude: kebele.longitude! + (Math.random() - 0.5) * 0.1,
        farmType: i % 3 === 0 ? FarmType.LIVESTOCK : i % 3 === 1 ? FarmType.CROP : FarmType.MIXED,
        cropType: cropTypes[i % cropTypes.length],
        soilType: soilTypes[i % soilTypes.length],
        farmSizeHa: 0.5 + Math.random() * 5,
        waterAccess: i % 3 === 0 ? WaterAccess.RAIN_FED : i % 3 === 1 ? WaterAccess.IRRIGATION : WaterAccess.MIXED,
        consent: i <= 8, // First 8 have consent
      },
    })

    // Create subscription for farmers with consent
    if (farmer.consent) {
      await prisma.subscription.create({
        data: {
          farmerId: farmer.id,
          plan: i <= 5 ? SubscriptionPlan.FREE : SubscriptionPlan.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
        },
      })
    }

    farmers.push(farmer)
  }

  console.log('Seed data created:')
  console.log(`- 2 Regions`)
  console.log(`- 2 Zones`)
  console.log(`- 2 Woredas`)
  console.log(`- 2 Kebeles`)
  console.log(`- 4 Users (2 Kebele Staff, 1 Admin, 1 Super Admin)`)
  console.log(`- 10 Farmers`)
  console.log('')
  console.log('Demo Credentials:')
  console.log('Kebele Staff 1: staff@kebele1.gov.et / password123')
  console.log('Kebele Staff 2: staff@kebele2.gov.et / password123')
  console.log('Admin: admin@woreda.gov.et / admin123')
  console.log('Super Admin: superadmin@et-safe.gov.et / superadmin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




