-- Migration: Equipes, Membros e OS de Tapetes de Execução
-- Adicionar coluna budgetId em execution_orders (vínculo com orçamento)
ALTER TABLE `execution_orders`
  ADD COLUMN IF NOT EXISTS `budgetId` int,
  ADD COLUMN IF NOT EXISTS `assignedMemberId` int;

-- Tabela de Equipes
CREATE TABLE IF NOT EXISTS `teams` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(100) NOT NULL,
  `description` text,
  `color` varchar(30) DEFAULT '#6366f1',
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Membros das Equipes
CREATE TABLE IF NOT EXISTS `team_members` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `teamId` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(30),
  `role` varchar(100) DEFAULT 'Técnico',
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de OS de Tapetes na Execução
CREATE TABLE IF NOT EXISTS `execution_carpets` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `orderNumber` int,
  `executionOrderId` int,
  `clientId` int,
  `clientName` varchar(255) NOT NULL,
  `clientPhone` varchar(30),
  `street` varchar(255),
  `addressNumber` varchar(20),
  `neighborhood` varchar(100),
  `city` varchar(100),
  `carpetType` varchar(100),
  `widthMeters` decimal(5,2),
  `lengthMeters` decimal(5,2),
  `squareMeters` decimal(6,2),
  `dirtLevel` enum('light','moderate','heavy') NOT NULL DEFAULT 'light',
  `observations` text,
  `scheduledDate` varchar(10) NOT NULL,
  `scheduledTime` varchar(5),
  `assignedTo` varchar(255),
  `assignedMemberId` int,
  `status` enum('pending','done','cancelled') NOT NULL DEFAULT 'pending',
  `totalValue` decimal(10,2) DEFAULT 0,
  `notes` text,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Fotos das OS de Tapetes de Execução
CREATE TABLE IF NOT EXISTS `execution_carpet_photos` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `executionCarpetId` int NOT NULL,
  `photoUrl` text NOT NULL,
  `photoKey` varchar(500),
  `photoType` enum('before','after','other') NOT NULL DEFAULT 'before',
  `caption` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
