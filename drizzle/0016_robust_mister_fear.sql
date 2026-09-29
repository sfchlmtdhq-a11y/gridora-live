CREATE TABLE `user_presence` (
	`sessionKey` varchar(64) NOT NULL,
	`sessionHash` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`isOnline` boolean NOT NULL DEFAULT true,
	`lastSeenAt` timestamp NOT NULL,
	CONSTRAINT `user_presence_sessionKey` PRIMARY KEY(`sessionKey`)
);
--> statement-breakpoint
CREATE INDEX `user_presence_session_idx` ON `user_presence` (`sessionHash`);--> statement-breakpoint
CREATE INDEX `user_presence_user_idx` ON `user_presence` (`userId`,`lastSeenAt`);