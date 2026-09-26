CREATE TABLE `status_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`statusId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `status_likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `status_like_idx` UNIQUE(`statusId`,`userId`)
);
