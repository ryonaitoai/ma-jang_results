CREATE TABLE `hanchan` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`hanchan_number` integer NOT NULL,
	`started_at` text,
	`ended_at` text,
	`is_void` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hanchan_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`hanchan_id` text NOT NULL,
	`member_id` text NOT NULL,
	`raw_score` integer NOT NULL,
	`rank` integer NOT NULL,
	`uma_point` real NOT NULL,
	`chips` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`hanchan_id`) REFERENCES `hanchan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`avatar_emoji` text DEFAULT '🀄' NOT NULL,
	`created_at` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`memo` text
);
--> statement-breakpoint
CREATE TABLE `operation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`operation_type` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`client_timestamp` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`hanchan_id` text,
	`rating` real DEFAULT 1500 NOT NULL,
	`rating_deviation` real DEFAULT 350 NOT NULL,
	`volatility` real DEFAULT 0.06 NOT NULL,
	`calculated_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hanchan_id`) REFERENCES `hanchan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rule_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`starting_points` integer DEFAULT 25000 NOT NULL,
	`return_points` integer DEFAULT 30000 NOT NULL,
	`uma_first` integer DEFAULT 30 NOT NULL,
	`uma_second` integer DEFAULT 10 NOT NULL,
	`uma_third` integer DEFAULT -10 NOT NULL,
	`uma_fourth` integer DEFAULT -30 NOT NULL,
	`chip_enabled` integer DEFAULT false NOT NULL,
	`chip_value` integer DEFAULT 100,
	`rate` text DEFAULT '点ピン',
	`rate_value` integer DEFAULT 100,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_members` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`member_id` text NOT NULL,
	`seat_order` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`rule_preset_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`starting_points` integer DEFAULT 25000 NOT NULL,
	`return_points` integer DEFAULT 30000 NOT NULL,
	`uma_first` integer DEFAULT 30 NOT NULL,
	`uma_second` integer DEFAULT 10 NOT NULL,
	`uma_third` integer DEFAULT -10 NOT NULL,
	`uma_fourth` integer DEFAULT -30 NOT NULL,
	`chip_enabled` integer DEFAULT false NOT NULL,
	`chip_value` integer DEFAULT 100,
	`rate` text DEFAULT '点ピン',
	`rate_value` integer DEFAULT 100,
	`started_at` text NOT NULL,
	`ended_at` text,
	`memo` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`rule_preset_id`) REFERENCES `rule_presets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settlement_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`from_member_id` text NOT NULL,
	`to_member_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`member_id` text NOT NULL,
	`total_point` real NOT NULL,
	`total_chips` integer DEFAULT 0 NOT NULL,
	`total_amount` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `yakuman_records` (
	`id` text PRIMARY KEY NOT NULL,
	`hanchan_id` text NOT NULL,
	`member_id` text NOT NULL,
	`yakuman_type` text NOT NULL,
	`memo` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`hanchan_id`) REFERENCES `hanchan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
