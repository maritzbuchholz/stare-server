import express from "express";
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

export default router;