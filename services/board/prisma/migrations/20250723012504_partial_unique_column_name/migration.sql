-- Remove old unique index if it exists
DROP INDEX IF EXISTS "Column_boardId_name_key";

-- Add partial unique index for active columns
CREATE UNIQUE INDEX "Column_boardId_name_active_key"
ON "Column"("boardId", "name")
WHERE "deletedAt" IS NULL;
