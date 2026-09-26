CREATE TABLE `admin_sessions` (
	`id` varchar(96) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_users` ADD `credentialId` varchar(255);--> statement-breakpoint
ALTER TABLE `admin_users` ADD `publicKey` text;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `counter` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `transports` text;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `challenge` text;--> statement-breakpoint
CREATE INDEX `admin_sessions_user_idx` ON `admin_sessions` (`userId`);