import express from "express";
import connection from "../mysql.js";
import { v4 as uuidv4 } from 'uuid';

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

export default router;