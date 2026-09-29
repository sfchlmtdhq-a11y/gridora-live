CREATE TABLE `message_hides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_hides_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_hide_user_idx` UNIQUE(`messageId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `message_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`userId` int NOT NULL,
	`emoji` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_reactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_reaction_user_idx` UNIQUE(`messageId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `notifications` ADD `actorId` int;--> statement-breakpoint
CREATE INDEX `message_hide_user_lookup_idx` ON `message_hides` (`userId`);--> statement-breakpoint
CREATE INDEX `message_reaction_message_idx` ON `message_reactions` (`messageId`);--> statement-breakpoint
CREATE INDEX `message_reaction_user_lookup_idx` ON `message_reactions` (`userId`);