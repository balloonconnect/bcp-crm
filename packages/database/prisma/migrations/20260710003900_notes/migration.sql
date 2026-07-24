-- Notes (Prompt 42): a generic, polymorphic, append-only note
-- attachable to any entity — built for the PWA's offline note-queueing
-- ("Add notes"), safe to replay if an offline sync retries. Additive
-- on top of 20260710003800.

CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notes_studio_id_idx" ON "notes"("studio_id");
CREATE INDEX "notes_entity_type_entity_id_idx" ON "notes"("entity_type", "entity_id");
ALTER TABLE "notes" ADD CONSTRAINT "notes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
