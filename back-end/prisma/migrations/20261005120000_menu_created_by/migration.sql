-- AlterTable
ALTER TABLE "Menu" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Menu" ADD COLUMN "updatedById" TEXT;

-- CreateIndex
CREATE INDEX "Menu_createdById_idx" ON "Menu"("createdById");
CREATE INDEX "Menu_updatedById_idx" ON "Menu"("updatedById");

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
