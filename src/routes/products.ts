import type { ResultSetHeader } from "mysql2";

import express from "express";
// import { v4 as uuidv4 } from 'uuid';

import connection from "../mysql.js";
import { requireApiKey } from "../utils/requireApiKey.js";
import { isNonEmptyStringUpTo, isPositiveInt, isPositiveIntUpTo, MAX_INT } from "../utils/validation.js";

const router = express.Router();

router.route("/").get(async (req, res) => {
    // The subquery is NULL for a product with no variants; COALESCE turns that into an empty array
    const sql = `
    SELECT 
    p.id, p.name, p.price_cents, p.description, p.image_url,
    COALESCE(
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', v.id, 'size', v.size, 'sku', v.sku, 'inventory_count', v.inventory_count)
            )
            FROM product_variants v
            WHERE v.product_id = p.id
        ),
        JSON_ARRAY()
    ) AS variants
    FROM products p
    ORDER BY p.id
    `;
    try {
        const [results] = await connection.query(sql);
        res.json(results);
    } catch (error) {
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
})

// Add the product-level info; variants (size/sku/stock) are added via POST /product_variants
router.route("/").post(requireApiKey, async (req, res) => {
    const { description, image_url, name, price_cents } = (req.body ?? {}) as Record<string, unknown>;

    const errors: string[] = [];
    // 255 is the size of these varchar columns in stare.sql
    if (!isNonEmptyStringUpTo(name, 255)) errors.push("name is required and must be a non-empty string of at most 255 characters");
    if (!isNonEmptyStringUpTo(description, 255)) errors.push("description is required and must be a non-empty string of at most 255 characters");
    if (!isNonEmptyStringUpTo(image_url, 255)) errors.push("image_url is required and must be a non-empty string of at most 255 characters");
    if (!isPositiveIntUpTo(price_cents, MAX_INT)) errors.push("price_cents is required and must be a positive integer of at most 2147483647");

    if (errors.length > 0) {
        return res.status(400).send(errors.join("; "));
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

// Update any of the product-level fields; only fields present in the body are changed
router.route("/:id").patch(requireApiKey, async (req, res) => {
    const productId = Number(req.params.id);
    const { description, image_url, name, price_cents } = (req.body ?? {}) as Record<string, unknown>;

    if (!isPositiveInt(productId)) {
        return res.status(400).send("Invalid product id");
    }

    const updates: string[] = [];
    const values: (number | string)[] = [];

    if (name !== undefined) {
        if (!isNonEmptyStringUpTo(name, 255)) return res.status(400).send("name must be a non-empty string of at most 255 characters");
        updates.push("name = ?");
        values.push(name);
    }
    if (description !== undefined) {
        if (!isNonEmptyStringUpTo(description, 255)) return res.status(400).send("description must be a non-empty string of at most 255 characters");
        updates.push("description = ?");
        values.push(description);
    }
    if (image_url !== undefined) {
        if (!isNonEmptyStringUpTo(image_url, 255)) return res.status(400).send("image_url must be a non-empty string of at most 255 characters");
        updates.push("image_url = ?");
        values.push(image_url);
    }
    if (price_cents !== undefined) {
        if (!isPositiveIntUpTo(price_cents, MAX_INT)) {
            return res.status(400).send("price_cents must be a positive integer of at most 2147483647");
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
router.route("/:id").delete(requireApiKey, async (req, res) => {
    const productId = Number(req.params.id);

    if (!isPositiveInt(productId)) {
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