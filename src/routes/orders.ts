import express from "express";
import type { ResultSetHeader } from "mysql2";
import connection from "../mysql.js";

const router = express.Router();

router.route("/").get(async (req, res) => {
    const sql = `
        SELECT
            o.*,
            COALESCE(
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT(
                        'id', oi.id,
                        'product_variant_id', oi.product_variant_id,
                        'product_name', oi.product_name,
                        'variant_size', oi.variant_size,
                        'product_sku', oi.product_sku,
                        'unit_price_cents', oi.unit_price_cents,
                        'quantity', oi.quantity,
                        'line_total_cents', oi.line_total_cents
                    ))
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ),
                JSON_ARRAY()
            ) AS items
        FROM orders o
        ORDER BY o.created_at DESC
    `;
    try {
        const [results] = await connection.query(sql);
        res.json(results);
    } catch (error) {
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
})

const ORDER_STATUSES = [
    "payment_pending",
    "payment_cancelled",
    "paid",
    "fulfilled",
    "refund_requested",
    "refunded",
];

router.route("/:id").patch(async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).send("Invalid order id");
    }
    if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).send(`status must be one of: ${ORDER_STATUSES.join(", ")}`);
    }

    try {
        const [result] = await connection.query<ResultSetHeader>(
            `UPDATE orders SET status = ? WHERE id = ?`,
            [status, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Order not found");
        }
        res.json({ id, status });
    } catch (error) {
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
});

export default router;