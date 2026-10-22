CREATE TABLE `administrators` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`user_id` text NOT NULL,
	`request_key` text NOT NULL,
	`fingerprint` text NOT NULL,
	`venue_id` integer NOT NULL,
	`venue_name` text NOT NULL,
	`facility_id` integer NOT NULL,
	`facility_name` text NOT NULL,
	`customer_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`booking_date` text NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	`timezone` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`court_name` text,
	`court_key` text,
	`admin_note` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_reference_unique` ON `bookings` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_user_request_unique` ON `bookings` (`user_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `bookings_user_created` ON `bookings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `bookings_status_created` ON `bookings` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `bookings_court_date` ON `bookings` (`venue_id`,`court_key`,`booking_date`,`status`);