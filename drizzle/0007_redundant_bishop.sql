CREATE TABLE `competitor_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`serviceName` varchar(255) NOT NULL,
	`price` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitor_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `competitors` ADD `siteUrl` varchar(500);