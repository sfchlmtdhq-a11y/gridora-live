ALTER TABLE `users` ADD `isFirstUser` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingRating` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `notifications` ADD `imageUrl` text;
