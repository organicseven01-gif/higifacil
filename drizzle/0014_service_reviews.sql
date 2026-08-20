-- Migration: Tabela de Avaliações Pós-Serviço
CREATE TABLE IF NOT EXISTS `service_reviews` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `executionOrderId` int NOT NULL,
  `token` varchar(64) NOT NULL UNIQUE,
  `clientName` varchar(255) NOT NULL,
  `clientPhone` varchar(30),
  `serviceDescription` text,
  `rating` int,
  `comment` text,
  `respondedAt` timestamp,
  `createdAt` timestamp DEFAULT NOW() NOT NULL
);
