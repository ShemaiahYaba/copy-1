CREATE TYPE "public"."assignment_status" AS ENUM('ACTIVE', 'INACTIVE', 'REMOVED', 'LEFT');--> statement-breakpoint
CREATE TYPE "public"."experience_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'published', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."project_category" AS ENUM('web_development', 'mobile_development', 'data_science', 'machine_learning', 'design', 'marketing', 'research', 'consulting', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_difficulty" AS ENUM('ROOKIE', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
CREATE TYPE "public"."project_visibility" AS ENUM('PUBLIC', 'UNIVERSITY_RESTRICTED');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('LEAD', 'MEMBER', 'OBSERVER');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('ACTIVE', 'INACTIVE', 'COMPLETED', 'DISBANDED');--> statement-breakpoint
CREATE TYPE "public"."team_visibility" AS ENUM('PUBLIC', 'PRIVATE', 'UNIVERSITY_ONLY');--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"shared_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_student_project_unique" UNIQUE("student_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "experience_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"role" varchar(50) DEFAULT 'STUDENT' NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"course_code" varchar(50),
	"overview" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"duration_weeks" integer,
	"learner_requirements" json,
	"company_preferences" json,
	"prerequisites" json,
	"expected_outcomes" json,
	"project_examples" json,
	"main_contact" json,
	"status" "experience_status" DEFAULT 'DRAFT' NOT NULL,
	"tags" json,
	"total_students" integer DEFAULT 0,
	"matches_count" integer DEFAULT 0,
	"published_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"organization" varchar(255),
	"organization_logo_url" varchar(500),
	"difficulty" "project_difficulty" DEFAULT 'ROOKIE',
	"objectives" text,
	"deliverables" text,
	"required_skills" json NOT NULL,
	"preferred_skills" json,
	"experience_level" varchar(50),
	"learner_requirements" json,
	"expected_outcomes" json,
	"additional_resources" json,
	"contact_persons" json,
	"duration" integer NOT NULL,
	"start_date" timestamp,
	"deadline" timestamp,
	"is_flexible_timeline" boolean DEFAULT false,
	"team_size" integer DEFAULT 1 NOT NULL,
	"max_applicants" integer DEFAULT 10,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"approval_status" "project_approval_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"category" "project_category" NOT NULL,
	"tags" json,
	"industry" varchar(100),
	"assigned_team_id" uuid,
	"assigned_at" timestamp,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_remote" boolean DEFAULT false,
	"location" varchar(255),
	"budget" integer,
	"compensation_type" varchar(50),
	"visibility" "project_visibility" DEFAULT 'PUBLIC',
	"confidential" boolean DEFAULT false,
	"view_count" integer DEFAULT 0,
	"application_count" integer DEFAULT 0,
	"bookmark_count" integer DEFAULT 0,
	"published_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'MEMBER' NOT NULL,
	"status" "assignment_status" DEFAULT 'ACTIVE' NOT NULL,
	"can_invite_members" boolean DEFAULT false,
	"can_edit_team" boolean DEFAULT false,
	"can_message_client" boolean DEFAULT false,
	"invited_by" uuid,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"removed_by" uuid,
	"removed_at" timestamp,
	"removal_reason" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_team_user_unique" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"avatar" varchar(500),
	"project_id" uuid,
	"assigned_at" timestamp,
	"supervisor_id" uuid,
	"lead_id" uuid,
	"status" "team_status" DEFAULT 'ACTIVE' NOT NULL,
	"visibility" "team_visibility" DEFAULT 'UNIVERSITY_ONLY' NOT NULL,
	"max_members" integer DEFAULT 10 NOT NULL,
	"current_member_count" integer DEFAULT 0 NOT NULL,
	"has_unread_messages" boolean DEFAULT false,
	"last_message_at" timestamp,
	"tags" json,
	"skills" json,
	"completed_at" timestamp,
	"disbanded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_participants" ADD CONSTRAINT "experience_participants_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_participants" ADD CONSTRAINT "experience_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_participants" ADD CONSTRAINT "experience_participants_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_removed_by_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_lead_id_users_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_student_idx" ON "bookmarks" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "bookmarks_university_idx" ON "bookmarks" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "bookmarks_project_idx" ON "bookmarks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "bookmarks_shared_by_idx" ON "bookmarks" USING btree ("shared_by");--> statement-breakpoint
CREATE INDEX "bookmarks_created_at_idx" ON "bookmarks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "participants_experience_idx" ON "experience_participants" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "participants_user_idx" ON "experience_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "participants_university_idx" ON "experience_participants" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "experiences_created_by_idx" ON "experiences" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "experiences_university_idx" ON "experiences" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "experiences_status_idx" ON "experiences" USING btree ("status");--> statement-breakpoint
CREATE INDEX "experiences_created_at_idx" ON "experiences" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "projects_client_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "projects_university_idx" ON "projects" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_category_idx" ON "projects" USING btree ("category");--> statement-breakpoint
CREATE INDEX "projects_published_idx" ON "projects" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "projects_assigned_team_idx" ON "projects" USING btree ("assigned_team_id");--> statement-breakpoint
CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assignments_team_idx" ON "team_assignments" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "assignments_user_idx" ON "team_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assignments_university_idx" ON "team_assignments" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "assignments_status_idx" ON "team_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "teams_created_by_idx" ON "teams" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "teams_university_idx" ON "teams" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "teams_project_idx" ON "teams" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "teams_supervisor_idx" ON "teams" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "teams_lead_idx" ON "teams" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "teams_status_idx" ON "teams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "teams_created_at_idx" ON "teams" USING btree ("created_at");
