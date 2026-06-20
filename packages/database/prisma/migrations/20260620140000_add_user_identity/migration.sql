-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "nickname" TEXT,
    "role" TEXT NOT NULL DEFAULT 'visitor',
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "otpCode" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "jwtSalt" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ageGroup" TEXT,
    "travelPref" JSONB,
    "mobilityLevel" TEXT,
    "childFlag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_mobile_key" ON "user"("mobile");

-- CreateIndex
CREATE INDEX "user_mobile_role_idx" ON "user"("mobile", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_user_id_key" ON "user_profile"("user_id");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rollback (manual only; do not execute automatically):
-- DROP TABLE "user_profile";
-- DROP TABLE "user";
