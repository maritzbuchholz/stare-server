DROP DATABASE IF EXISTS `stare`;

CREATE DATABASE `stare`;

USE `stare`;

CREATE TABLE `products` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `price_cents` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `sku` varchar(255) NOT NULL,
  `inventory_count` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_sku_unique` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `status` enum('pending','paid','fulfilled','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `subtotal_cents` int NOT NULL,
  `shipping_cents` int NOT NULL DEFAULT 0,
  `tax_cents` int NOT NULL DEFAULT 0,
  `total_cents` int NOT NULL,
  `shipping_address` json NULL,
  `stripe_payment_intent_id` varchar(255) NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `order_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `product_sku` varchar(100) NOT NULL,
  `unit_price_cents` int NOT NULL,
  `quantity` int NOT NULL,
  `line_total_cents` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_product_id_foreign` (`product_id`),
  CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `products` VALUES
    (1, "Shirt", 2500, "A comfortable cotton t-shirt", "https://placecats.com/300/300", "SKU00001", 30, NOW(), NOW()),
    (2, "Beanie", 1500, "A comfortable beanie", "https://placecats.com/300/300", "SKU00002", 50, NOW(), NOW()),
    (3, "Record", 1200, "A warm hat", "https://placecats.com/300/300", "SKU00003", 75, NOW(), NOW());