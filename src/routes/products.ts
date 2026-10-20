import type { ResultSetHeader } from "mysql2";

import express from "express";
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

const isInt = (value: unknown): value is number => Number.isInteger(value);

// Add the product-level info; variants (size/sku/stock) are added via POST /products/:id
router.route("/").post(async (req, res) => {
    const { description, image_url, name, price_cents } = (req.body ?? {}) as Record<string, unknown>;

    if (!isNonEmptyString(name) || !isNonEmptyString(description) || !isNonEmptyString(image_url)) {
        return res.status(400).send("name, description and image_url are required non-empty strings");
    }
    if (!isInt(price_cents) || price_cents <= 0) {
        return res.status(400).send("price_cents must be a positive integer");
    }

    try {
        const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO products (name, price_cents, description, image_url) VALUES (?, ?, ?, ?)`,
            [name, price_cents, description, image_url]
        );
        res.status(201).json({ description, id: result.insertId, image_url, name, price_cents });
    } catch (error) {
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
});

// Add a variant (size, sku, stock, Stripe price id) to an existing product
router.route("/:id").post(async (req, res) => {
    const productId = Number(req.params.id);
    const { inventory_count = 0, price_id, size, sku } = (req.body ?? {}) as Record<string, unknown>;

    if (!Number.isInteger(productId) || productId < 1) {
        return res.status(400).send("Invalid product id");
    }
    if (!isNonEmptyString(size) || !isNonEmptyString(sku) || !isNonEmptyString(price_id)) {
        return res.status(400).send("size, sku and price_id are required non-empty strings");
    }
    if (!isInt(inventory_count) || inventory_count < 0) {
        return res.status(400).send("inventory_count must be a non-negative integer");
    }

    try {
        const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO product_variants (product_id, size, sku, inventory_count, price_id) VALUES (?, ?, ?, ?, ?)`,
            [productId, size, sku, inventory_count, price_id]
        );
        res.status(201).json({
            id: result.insertId,
            inventory_count,
            price_id,
            product_id: productId,
            size,
            sku,
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

// Update any of the product-level fields; only fields present in the body are changed
router.route("/:id").patch(async (req, res) => {
    const productId = Number(req.params.id);
    const { description, image_url, name, price_cents } = (req.body ?? {}) as Record<string, unknown>;

    if (!Number.isInteger(productId) || productId < 1) {
        return res.status(400).send("Invalid product id");
    }

    const updates: string[] = [];
    const values: (number | string)[] = [];

    if (name !== undefined) {
        if (!isNonEmptyString(name)) return res.status(400).send("name must be a non-empty string");
        updates.push("name = ?");
        values.push(name);
    }
    if (description !== undefined) {
        if (!isNonEmptyString(description)) return res.status(400).send("description must be a non-empty string");
        updates.push("description = ?");
        values.push(description);
    }
    if (image_url !== undefined) {
        if (!isNonEmptyString(image_url)) return res.status(400).send("image_url must be a non-empty string");
        updates.push("image_url = ?");
        values.push(image_url);
    }
    if (price_cents !== undefined) {
        if (!isInt(price_cents) || price_cents <= 0) {
            return res.status(400).send("price_cents must be a positive integer");
        }
        updates.push("price_cents = ?");
        values.push(price_cents);
    }

    if (updates.length === 0) {
        return res.status(400).send("Provide at least one of: name, price_cents, description, image_url");
    }

    try {
        const [result] = await connection.query<ResultSetHeader>(
            `UPDATE products SET ${updates.join(", ")} WHERE id = ?`,
            [...values, productId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Product not found");
        }
        const [rows] = await connection.query(
            `SELECT id, name, price_cents, description, image_url FROM products WHERE id = ?`,
            [productId]
        );
        res.json((rows as unknown[])[0]);
    } catch (error) {
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
});

// Delete a product; its variants are removed too via ON DELETE CASCADE
router.route("/:id").delete(async (req, res) => {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId < 1) {
        return res.status(400).send("Invalid product id");
    }

    try {
        const [result] = await connection.query<ResultSetHeader>(
            `DELETE FROM products WHERE id = ?`,
            [productId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Product not found");
        }
        res.status(204).send();
    } catch (error) {
        // order_items references product_variants with no cascade, so variants that
        // appear in past orders block the delete (the whole statement is rolled back)
        if ((error as { code?: string }).code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).send("Product has variants in existing orders and can't be deleted");
        }
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
});

export default router;