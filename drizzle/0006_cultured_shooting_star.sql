CREATE TABLE `competitor_criteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`unit` varchar(100),
	`type` enum('number','text','rating','boolean') NOT NULL DEFAULT 'text',
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitor_criteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitor_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`criteriaId` int NOT NULL,
	`value` varchar(500),
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitor_scores_id` PRIMARY KEY(`id`)
);
