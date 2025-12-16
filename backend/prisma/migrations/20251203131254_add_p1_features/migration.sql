-- CreateTable
CREATE TABLE "trainings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "training_type" TEXT NOT NULL DEFAULT 'product',
    "format" TEXT NOT NULL DEFAULT 'online',
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "instructor_name" TEXT,
    "max_participants" INTEGER,
    "materials" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "trainings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "training_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "training_id" TEXT NOT NULL,
    "distributor_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "registered_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "attendance_status" TEXT,
    "exam_score" REAL,
    "feedback" TEXT,
    "certificate_issued" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_participants_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "trainings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_participants_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resource_library" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'product_doc',
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "file_type" TEXT,
    "storage_type" TEXT NOT NULL DEFAULT 'url',
    "thumbnail_url" TEXT,
    "keywords" TEXT,
    "access_level" TEXT NOT NULL DEFAULT 'all',
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "published_at" DATETIME,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "resource_library_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticket_number" TEXT NOT NULL,
    "distributor_id" TEXT NOT NULL,
    "ticket_type" TEXT NOT NULL DEFAULT 'technical',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "first_response_at" DATETIME,
    "resolved_at" DATETIME,
    "closed_at" DATETIME,
    "resolution_time" INTEGER,
    "satisfaction_rating" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "support_tickets_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ticket_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributor_id" TEXT NOT NULL,
    "cert_type" TEXT NOT NULL,
    "cert_name" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'bronze',
    "obtained_date" DATETIME NOT NULL,
    "expiry_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "exam_score" REAL,
    "exam_date" DATETIME,
    "certificate_url" TEXT,
    "verification_code" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "certifications_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "trainings_start_date_idx" ON "trainings"("start_date");

-- CreateIndex
CREATE INDEX "trainings_training_type_idx" ON "trainings"("training_type");

-- CreateIndex
CREATE INDEX "trainings_status_idx" ON "trainings"("status");

-- CreateIndex
CREATE INDEX "trainings_created_by_idx" ON "trainings"("created_by");

-- CreateIndex
CREATE INDEX "training_participants_training_id_idx" ON "training_participants"("training_id");

-- CreateIndex
CREATE INDEX "training_participants_distributor_id_idx" ON "training_participants"("distributor_id");

-- CreateIndex
CREATE INDEX "training_participants_status_idx" ON "training_participants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "training_participants_training_id_distributor_id_key" ON "training_participants"("training_id", "distributor_id");

-- CreateIndex
CREATE INDEX "resource_library_category_idx" ON "resource_library"("category");

-- CreateIndex
CREATE INDEX "resource_library_access_level_idx" ON "resource_library"("access_level");

-- CreateIndex
CREATE INDEX "resource_library_is_active_idx" ON "resource_library"("is_active");

-- CreateIndex
CREATE INDEX "resource_library_created_by_idx" ON "resource_library"("created_by");

-- CreateIndex
CREATE INDEX "resource_library_published_at_idx" ON "resource_library"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "support_tickets_distributor_id_idx" ON "support_tickets"("distributor_id");

-- CreateIndex
CREATE INDEX "support_tickets_created_by_idx" ON "support_tickets"("created_by");

-- CreateIndex
CREATE INDEX "support_tickets_assigned_to_idx" ON "support_tickets"("assigned_to");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_tickets_ticket_type_idx" ON "support_tickets"("ticket_type");

-- CreateIndex
CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets"("created_at");

-- CreateIndex
CREATE INDEX "ticket_comments_ticket_id_idx" ON "ticket_comments"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_comments_user_id_idx" ON "ticket_comments"("user_id");

-- CreateIndex
CREATE INDEX "ticket_comments_created_at_idx" ON "ticket_comments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_verification_code_key" ON "certifications"("verification_code");

-- CreateIndex
CREATE INDEX "certifications_distributor_id_idx" ON "certifications"("distributor_id");

-- CreateIndex
CREATE INDEX "certifications_status_idx" ON "certifications"("status");

-- CreateIndex
CREATE INDEX "certifications_expiry_date_idx" ON "certifications"("expiry_date");

-- CreateIndex
CREATE INDEX "certifications_cert_type_idx" ON "certifications"("cert_type");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_distributor_id_cert_type_level_key" ON "certifications"("distributor_id", "cert_type", "level");
