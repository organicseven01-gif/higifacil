-- Migration: bank_imports e bank_transactions para extrato bancário com IA

CREATE TABLE `bank_imports` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `companyId` int NOT NULL,
  `fileName` varchar(500) NOT NULL,
  `fileUrl` varchar(1024) NOT NULL,
  `fileKey` varchar(500) NOT NULL,
  `fileType` enum('pdf','ofx','csv','other') NOT NULL DEFAULT 'pdf',
  `referenceMonth` varchar(7) NOT NULL,
  `bankName` varchar(100),
  `status` enum('processing','done','error') NOT NULL DEFAULT 'processing',
  `totalTransactions` int DEFAULT 0,
  `pendingReview` int DEFAULT 0,
  `errorMessage` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `bank_transactions` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `companyId` int NOT NULL,
  `importId` int NOT NULL,
  `transactionDate` varchar(10) NOT NULL,
  `description` varchar(500) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('credit','debit') NOT NULL,
  `category` varchar(100),
  `isPersonal` boolean NOT NULL DEFAULT false,
  `reviewStatus` enum('auto','manual','pending') NOT NULL DEFAULT 'pending',
  `aiConfidence` decimal(3,2),
  `aiSuggestedCategory` varchar(100),
  `linkedSaleId` int,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
