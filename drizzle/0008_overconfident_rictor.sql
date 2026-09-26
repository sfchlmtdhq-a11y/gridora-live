CREATE TABLE `site_content` (
	`key` varchar(80) NOT NULL,
	`value` text NOT NULL,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_content_key` PRIMARY KEY(`key`)
);
