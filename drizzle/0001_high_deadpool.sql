CREATE TABLE `budget_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`serviceId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budget_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientPhone` varchar(30) NOT NULL,
	`clientAddress` text,
	`subtotal` decimal(10,2) NOT NULL DEFAULT '0',
	`discountType` enum('percent','fixed') DEFAULT 'fixed',
	`discountValue` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL DEFAULT '0',
	`status` enum('pending','sent','accepted','rejected') NOT NULL DEFAULT 'pending',
	`notes` text,
	`videos` text,
	`validDays` int NOT NULL DEFAULT 7,
	`paymentConditions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`email` varchar(320),
	`address` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`category` varchar(100) NOT NULL DEFAULT 'Geral',
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
