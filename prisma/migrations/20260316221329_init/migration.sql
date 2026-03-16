-- CreateTable
CREATE TABLE "academic_levels" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "academic_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_levels_name_key" ON "academic_levels"("name");

-- CreateIndex
CREATE INDEX "idx_academic_level_isDeleted" ON "academic_levels"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_academic_level_name" ON "academic_levels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "academic_terms_name_key" ON "academic_terms"("name");

-- CreateIndex
CREATE INDEX "idx_academic_term_isDeleted" ON "academic_terms"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_academic_term_name" ON "academic_terms"("name");
