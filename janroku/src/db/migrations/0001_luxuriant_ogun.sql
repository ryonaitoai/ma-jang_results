PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_hanchan_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`hanchan_id` text NOT NULL,
	`member_id` text NOT NULL,
	`raw_score` integer,
	`rank` integer NOT NULL,
	`point` real NOT NULL,
	`uma_point` real,
	`input_mode` text DEFAULT 'point' NOT NULL,
	`is_auto_calculated` integer DEFAULT false NOT NULL,
	`chips` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`hanchan_id`) REFERENCES `hanchan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_hanchan_scores`("id", "hanchan_id", "member_id", "raw_score", "rank", "point", "uma_point", "input_mode", "is_auto_calculated", "chips", "created_at") SELECT "id", "hanchan_id", "member_id", "raw_score", "rank", "uma_point", "uma_point", 'raw_score', false, "chips", "created_at" FROM `hanchan_scores`;--> statement-breakpoint
DROP TABLE `hanchan_scores`;--> statement-breakpoint
ALTER TABLE `__new_hanchan_scores` RENAME TO `hanchan_scores`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `hanchan` ADD `top_member_id` text REFERENCES members(id);
