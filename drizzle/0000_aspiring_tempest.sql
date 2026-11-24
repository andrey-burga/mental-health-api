CREATE TABLE "articles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(150) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(500) NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"category" varchar(80) NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "daily_reflections" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"phrase" text NOT NULL,
	"author" varchar(100) DEFAULT 'Anónimo',
	"show_date" date,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_reflections_show_date_unique" UNIQUE("show_date")
);
--> statement-breakpoint
CREATE TABLE "diaries" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"mood" varchar(50) NOT NULL,
	"text" text NOT NULL,
	"tag" varchar(60) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disorders" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(150) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "disorders_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"text" varchar(300) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"category" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"refresh_token_hash" varchar(128) NOT NULL,
	"device_name" varchar(255),
	"ip_address" varchar(100),
	"location" varchar(255),
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
CREATE TABLE "symptoms" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"text" varchar(500) NOT NULL,
	"disorder_id" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(150) NOT NULL,
	"title" varchar(200) NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "testimonials_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"role_id" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diaries" ADD CONSTRAINT "diaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptoms" ADD CONSTRAINT "symptoms_disorder_id_disorders_id_fk" FOREIGN KEY ("disorder_id") REFERENCES "public"."disorders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;