CREATE TABLE `gridora_ai_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gridora_ai_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gridora_ai_profiles` (
	`userId` int NOT NULL,
	`designMemory` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gridora_ai_profiles_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `gridora_ai_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gridora_ai_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `gridora_ai_messages_thread_idx` ON `gridora_ai_messages` (`threadId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `gridora_ai_messages_user_idx` ON `gridora_ai_messages` (`userId`);--> statement-breakpoint
CREATE INDEX `gridora_ai_threads_user_idx` ON `gridora_ai_threads` (`userId`);