CREATE TABLE `discord_webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhook_url` text NOT NULL,
	`channel_name` varchar(100),
	`is_active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discord_webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`team_id` int NOT NULL,
	`team_name` varchar(100) NOT NULL,
	`created_by` int NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_by` int,
	`used_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_invitations_token_unique` UNIQUE(`token`)
);
