import express from "express";
import type { ResultSetHeader } from "mysql2";
// import { v4 as uuidv4 } from 'uuid';

import connection from "../mysql.js";

const router = express.Router();

router.route("/").get(async (req, res) => {
    const sql = `
    SELECT 
    p.id, p.name, p.price_cents, p.description, p.image_url,
    JSON_ARRAYAGG(
        JSON_OBJECT('id', v.id, 'size', v.size, 'sku', v.sku, 'inventory_count', v.inventory_count)
    ) AS variants
    FROM products p
    LEFT JOIN product_variants v ON v.product_id = p.id
    GROUP BY p.id
    `;
    try {
        const [results] = await connection.query(sql);
        res.json(results);
    } catch (error) {
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
})

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

// Add the product-level info; variants (size/sku/stock) are added via POST /products/:id
router.route("/").post(async (req, res) => {
    const { name, price_cents, description, image_url } = req.body ?? {};

    if (!isNonEmptyString(name) || !isNonEmptyString(description) || !isNonEmptyString(image_url)) {
        return res.status(400).send("name, description and image_url are required non-empty strings");
    }
    if (!Number.isInteger(price_cents) || price_cents <= 0) {
        return res.status(400).send("price_cents must be a positive integer");
    }

    try {
        const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO products (name, price_cents, description, image_url) VALUES (?, ?, ?, ?)`,
            [name, price_cents, description, image_url]
        );
        res.status(201).json({ id: result.insertId, name, price_cents, description, image_url });
    } catch (error) {
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
});

// Add a variant (size, sku, stock, Stripe price id) to an existing product
router.route("/:id").post(async (req, res) => {
    const productId = Number(req.params.id);
    const { size, sku, inventory_count = 0, price_id } = req.body ?? {};

    if (!Number.isInteger(productId) || productId < 1) {
        return res.status(400).send("Invalid product id");
    }
    if (!isNonEmptyString(size) || !isNonEmptyString(sku) || !isNonEmptyString(price_id)) {
        return res.status(400).send("size, sku and price_id are required non-empty strings");
    }
    if (!Number.isInteger(inventory_count) || inventory_count < 0) {
        return res.status(400).send("inventory_count must be a non-negative integer");
    }

    try {
        const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO product_variants (product_id, size, sku, inventory_count, price_id) VALUES (?, ?, ?, ?, ?)`,
            [productId, size, sku, inventory_count, price_id]
        );
        res.status(201).json({
            id: result.insertId,
            product_id: productId,
            size,
            sku,
            inventory_count,
            price_id,
        });
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(404).send("Product not found");
        }
        if (code === "ER_DUP_ENTRY") {
            return res.status(409).send("sku already exists, or this product already has that size");
        }
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
});

export default router;