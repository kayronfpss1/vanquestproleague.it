CREATE TABLE `elo_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`team_id` int NOT NULL,
	`elo` int NOT NULL,
	`match_id` int,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `elo_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`winner_id` int NOT NULL,
	`loser_id` int NOT NULL,
	`winner_name` varchar(100) NOT NULL,
	`loser_name` varchar(100) NOT NULL,
	`winner_elo_before` int NOT NULL,
	`loser_elo_before` int NOT NULL,
	`elo_change` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staff_id` int NOT NULL,
	`staff_name` varchar(200) NOT NULL,
	`action` varchar(100) NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`elo` int NOT NULL DEFAULT 1500,
	`streak` int NOT NULL DEFAULT 0,
	`best_streak` int NOT NULL DEFAULT 0,
	`freeroam_wins` int NOT NULL DEFAULT 0,
	`freeroam_losses` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_name_unique` UNIQUE(`name`)
);
