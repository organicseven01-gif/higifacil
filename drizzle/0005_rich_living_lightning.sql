CREATE TABLE `competitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`services` text,
	`priceRange` varchar(255),
	`instagramUrl` varchar(500),
	`googleUrl` varchar(500),
	`googleReviews` int DEFAULT 0,
	`googleRating` decimal(2,1),
	`notes` text,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitors_id` PRIMARY KEY(`id`)
);
