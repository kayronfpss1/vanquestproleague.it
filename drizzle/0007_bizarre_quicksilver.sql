CREATE TABLE `faction_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`faction_id` int NOT NULL,
	`user_id` int NOT NULL,
	`assigned_by` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `faction_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `factions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`created_by` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `factions_id` PRIMARY KEY(`id`),
	CONSTRAINT `factions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `win_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submitted_by` int NOT NULL,
	`winner_faction_id` int NOT NULL,
	`loser_faction_id` int NOT NULL,
	`screenshot_url` varchar(500),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approved_by` int,
	`rejection_reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`approved_at` timestamp,
	CONSTRAINT `win_submissions_id` PRIMARY KEY(`id`)
);
