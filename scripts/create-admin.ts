import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('ADMIN_EMAIL ve en az 12 karakterli ADMIN_PASSWORD ortam degiskenlerini .env dosyasina yaz.');
  }
  const normalizedEmail = email.toLowerCase().trim();
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: 'Admin',
      hashedPassword,
      isAdmin: true,
      companyName: 'MarkaRapor Admin',
      isActive: true,
    },
    create: {
      email: normalizedEmail,
      name: 'Admin',
      hashedPassword,
      companyName: 'MarkaRapor Admin',
      isAdmin: true,
      isActive: true,
    },
  });

  const isValid = await bcrypt.compare(password, user.hashedPassword);

  console.log(JSON.stringify({
    email: user.email,
    isAdmin: user.isAdmin,
    passwordOK: isValid,
    companyName: user.companyName,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
