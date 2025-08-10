-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('MAIN', 'SMURF', 'BANNED', 'OTHER');

-- CreateTable
CREATE TABLE "public"."AppUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "region" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'OTHER',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recoveryEmail" TEXT,
    "notes" TEXT,
    "secretBlob" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "public"."AppUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Game_name_key" ON "public"."Game"("name");

-- CreateIndex
CREATE INDEX "GameAccount_userId_idx" ON "public"."GameAccount"("userId");

-- CreateIndex
CREATE INDEX "GameAccount_gameId_idx" ON "public"."GameAccount"("gameId");

-- AddForeignKey
ALTER TABLE "public"."GameAccount" ADD CONSTRAINT "GameAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameAccount" ADD CONSTRAINT "GameAccount_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
