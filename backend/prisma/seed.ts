import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Seed Users
  const usersPath = path.join(__dirname, '../output/users.json');
  if (fs.existsSync(usersPath)) {
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    for (const user of usersData.users) {
      await prisma.user.upsert({
        where: { username: user.username },
        update: {}, // Don't update if they already exist
        create: {
          username: user.username,
          passwordHash: user.password, // Storing raw for hackathon demo speed, hash in real life!
          role: user.role,
          displayName: user.display_name,
        },
      });
    }
    console.log('✅ Users seeded');
  }

  // 2. Seed Validation Rules
  const rulesPath = path.join(__dirname, '../output/validation_rules.json');
  if (fs.existsSync(rulesPath)) {
    const rulesData = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
    for (const rule of rulesData.rules) {
      const { id, description, severity, ...config } = rule;
      await prisma.validationRule.upsert({
        where: { id: id },
        update: {}, // Don't update if they already exist
        create: {
          id: id,
          description: description,
          severity: severity,
          config: Object.keys(config).length > 0 ? JSON.stringify(config) : null,
        },
      });
    }
    console.log('✅ Validation rules seeded');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });