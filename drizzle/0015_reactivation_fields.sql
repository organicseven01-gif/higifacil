ALTER TABLE `clients` ADD COLUMN `reactivationDays` int;
ALTER TABLE `clients` ADD COLUMN `reactivationDueDate` varchar(10);
ALTER TABLE `clients` ADD COLUMN `lastServiceDate` varchar(10);
