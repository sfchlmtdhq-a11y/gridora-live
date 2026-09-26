CREATE TABLE `user_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_blocks_pair_idx` UNIQUE(`userId`,`blockedUserId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `moderationStatus` enum('active','suspended','deleted') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `moderationReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `moderatedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `moderatedAt` timestamp;--> statement-breakpoint
CREATE INDEX `user_blocks_blocker_idx` ON `user_blocks` (`userId`);--> statement-breakpoint
CREATE INDEX `user_blocks_blocked_idx` ON `user_blocks` (`blockedUserId`);--> statement-breakpoint
CREATE INDEX `reports_reporter_idx` ON `reports` (`reporterId`);