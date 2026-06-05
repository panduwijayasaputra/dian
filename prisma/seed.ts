import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      username: 'admin',
      passwordHash,
    },
  })
  console.log('Seed complete. Admin user: admin / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
