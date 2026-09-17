// Creates the teacher (admin) account or resets its password.
// Usage: npm run create-admin -- [login] [firstName]
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generatePassword, hashPassword } from "../src/lib/password";

async function main() {
  const login = (process.argv[2] ?? "admin").trim().toLowerCase();
  const firstName = process.argv[3] ?? "Admin";
  const password = generatePassword(12);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  try {
    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
      where: { login },
      // New password logs the teacher out on other devices
      update: { passwordHash, isActive: true, role: "ADMIN", sessionVersion: { increment: 1 } },
      create: { login, passwordHash, role: "ADMIN", firstName },
    });

    console.log("\n  Аккаунт преподавателя готов / O‘qituvchi akkaunti tayyor\n");
    console.log(`  Логин / Login:  ${login}`);
    console.log(`  Пароль / Parol: ${password}\n`);
    console.log("  Сохраните пароль — он показывается только один раз.\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
