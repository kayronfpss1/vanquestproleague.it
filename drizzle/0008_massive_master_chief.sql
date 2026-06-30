CREATE TABLE `faction_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`faction_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `faction_roles_id` PRIMARY KEY(`id`)
);
