CREATE TABLE IF NOT EXISTS `demo_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `whatsapp` varchar(30) NOT NULL,
  `city` varchar(100) NOT NULL,
  `scheduled_date` varchar(10) NOT NULL,
  `scheduled_time` varchar(5) NOT NULL,
  `status` enum('pending','done','no_show','cancelled') NOT NULL DEFAULT 'pending',
  `notes` text,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
