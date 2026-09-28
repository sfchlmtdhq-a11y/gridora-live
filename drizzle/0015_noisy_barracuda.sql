CREATE TABLE `hidden_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hiddenUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hidden_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `hidden_contacts_pair_idx` UNIQUE(`userId`,`hiddenUserId`)
);
--> statement-breakpoint
CREATE INDEX `hidden_contacts_user_idx` ON `hidden_contacts` (`userId`);