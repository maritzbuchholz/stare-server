import type { ResultSetHeader } from "mysql2";

import express from "express";

import connection from "../mysql.js";
import { isNonEmptyString, isNonNegativeInt, isPositiveInt } from "../utils/validation.js";

const router = express.Router();

// Add a variant linked to an existing product via product_id (sku, size and price_id are required)
router.route("/").post(async (req, res) => {
    const { inventory_count = 0, price_id, product_id, size, sku } = (req.body ?? {}) as Record<string, unknown>;

    if (!isPositiveInt(product_id)) {
        return res.status(400).send("product_id must be a positive integer");
    }
    if (!isNonEmptyString(sku) || !isNonEmptyString(size) || !isNonEmptyString(price_id)) {
        return res.status(400).send("sku, size and price_id are required non-empty strings");
    }
    if (!isNonNegativeInt(inventory_count)) {
        return res.status(400).send("inventory_count must be a non-negative integer");
    }

    try {
        const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO product_variants (product_id, size, sku, inventory_count, price_id) VALUES (?, ?, ?, ?, ?)`,
            [product_id, size, sku, inventory_count, price_id]
        );
        res.status(201).json({
            id: result.insertId,
            inventory_count,
            price_id,
            product_id,
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

// Update a variant looked up by its current sku; only fields present in the body are changed
// (sending a new `sku` in the body renames it)
router.route("/:sku").patch(async (req, res) => {
    const currentSku = req.params.sku;
    const { inventory_count, price_id, size, sku } = (req.body ?? {}) as Record<string, unknown>;

    const updates: string[] = [];
    const values: (number | string)[] = [];

    if (size !== undefined) {
        if (!isNonEmptyString(size)) return res.status(400).send("size must be a non-empty string");
        updates.push("size = ?");
        values.push(size);
    }
    if (sku !== undefined) {
        if (!isNonEmptyString(sku)) return res.status(400).send("sku must be a non-empty string");
        updates.push("sku = ?");
        values.push(sku);
    }
    if (inventory_count !== undefined) {
        if (!isNonNegativeInt(inventory_count)) {
            return res.status(400).send("inventory_count must be a non-negative integer");
        }
        updates.push("inventory_count = ?");
        values.push(inventory_count);
    }
    if (price_id !== undefined) {
        if (!isNonEmptyString(price_id)) return res.status(400).send("price_id must be a non-empty string");
        updates.push("price_id = ?");
        values.push(price_id);
    }

    if (updates.length === 0) {
        return res.status(400).send("Provide at least one of: size, sku, inventory_count, price_id");
    }

    try {
        const [result] = await connection.query<ResultSetHeader>(
            `UPDATE product_variants SET ${updates.join(", ")} WHERE sku = ?`,
            [...values, currentSku]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Variant not found");
        }
        const [rows] = await connection.query(
            `SELECT id, product_id, size, sku, inventory_count, price_id FROM product_variants WHERE sku = ?`,
            [sku ?? currentSku]
        );
        res.json((rows as unknown[])[0]);
    } catch (error) {
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
            return res.status(409).send("sku already exists, or this product already has that size");
        }
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
});

export default router;
