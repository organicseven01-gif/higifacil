-- Expandir enum de roles na tabela users
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','master','vendedor','secretaria','funcionario') NOT NULL DEFAULT 'user';--> statement-breakpoint

-- Tabela de Execução / Dia a Dia
CREATE TABLE `execution_orders` (
  `id` int AUTO_INCREMENT NOT NULL,
  `orderNumber` int,
  `saleId` int,
  `clientId` int,
  `clientName` varchar(255) NOT NULL,
  `clientPhone` varchar(30),
  `street` varchar(255),
  `addressNumber` varchar(20),
  `complement` varchar(100),
  `neighborhood` varchar(100),
  `city` varchar(100),
  `state` varchar(2),
  `serviceDescription` text,
  `totalValue` decimal(10,2) DEFAULT '0',
  `scheduledDate` varchar(10) NOT NULL,
  `scheduledTime` varchar(5),
  `status` enum('pending','done','cancelled') NOT NULL DEFAULT 'pending',
  `assignedTo` varchar(255),
  `notes` text,
  `completedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `execution_orders_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

-- Tabela de Upsell (Vendas em Campo)
CREATE TABLE `upsell_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `executionOrderId` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `unitPrice` decimal(10,2) NOT NULL DEFAULT '0',
  `total` decimal(10,2) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `upsell_items_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

-- Tabela de Fotos de Execução
CREATE TABLE `execution_photos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `executionOrderId` int NOT NULL,
  `photoUrl` text NOT NULL,
  `photoKey` varchar(500),
  `photoType` enum('before','after','other') NOT NULL DEFAULT 'before',
  `caption` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `execution_photos_id` PRIMARY KEY(`id`)
);
