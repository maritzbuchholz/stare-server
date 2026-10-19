import express from "express";
import type { ResultSetHeader } from "mysql2";
import connection from "../mysql.js";

const router = express.Router();

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

// Update a variant looked up by its current sku; only fields present in the body are changed
// (sending a new `sku` in the body renames it)
router.route("/:sku").patch(async (req, res) => {
    const currentSku = req.params.sku;
    const { size, sku, inventory_count, price_id } = req.body ?? {};

    const updates: string[] = [];
    const values: (string | number)[] = [];

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
        if (!Number.isInteger(inventory_count) || inventory_count < 0) {
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
