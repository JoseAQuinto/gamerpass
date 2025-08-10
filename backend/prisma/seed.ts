import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const games = ["League of Legends", "Valorant", "CS2", "Fortnite", "Overwatch 2"];
  for (const name of games) {
    await prisma.game.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("Seed ok");
}
main().finally(() => prisma.$disconnect());
