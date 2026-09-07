import express from "express";
import Stripe from "stripe";

import connection from "../mysql.js";

const router = express.Router();

const confirm = process.env.CONFIRM
if (!confirm) throw new Error('Missing CONFIRM');
const successPage = `http://localhost:${confirm}`;

const stripeKey = process.env.STRIPE_KEY;
if (!stripeKey) throw new Error('Missing STRIPE_KEY');
const stripe = new Stripe(stripeKey);

router.route("/").post(async (req, res) => {
    const { items } = req.body as {
        items: { quantity: number; sku: string; }[];
    };

    //if items array is empty, return error message to client
    if (items.length === 0) {
        res.status(400).json({ error: "No items provided" });
        return;
    }

    //Capture items where quantity is not an integer OR is negative; map the resulting skus to a new array
    const invalidQuantitySkus = items
        .filter((item) => !Number.isInteger(item.quantity) || item.quantity < 1)
        .map((item) => item.sku);
    //Return an error message to the client if there are items with erroneous quantities
    if (invalidQuantitySkus.length > 0) {
        res.status(400).json({ error: `Invalid quantity for sku(s): ${invalidQuantitySkus.join(", ")}` });
        return;
    }

    try {
        //Create an array of skus
        const skus = items.map((item) => item.sku);

        //select sku, price_id, invetory_count where sku is in the cart sku array
        const sql = `
        SELECT sku, price_id, inventory_count
        FROM product_variants
        WHERE sku IN (?)
        `;

        //Wrapping [skus] - the first ? placeholder gets replaced with this whole array
        //Then, deconstructing [row, fields] tuple into single array of objects; row is target data and fields is metadata
        const [rows] = await connection.query(sql, [skus]);

        //Confirms shape of mysql pull as compile-time check
        const variants = rows as { inventory_count: number; price_id: string; sku: string; }[];

        //Creates an object with skus and keys
        const variantBySku = new Map(variants.map((v) => [v.sku, v]));

        //Checks if skus are missing and sends error back to client
        const missingSkus = skus.filter((sku) => !variantBySku.has(sku));
        if (missingSkus.length > 0) {
            res.status(400).json({ error: `Unknown sku(s): ${missingSkus.join(", ")}` });
            return;
        }

        //Captures any items where purchase quantity > inventory count and puts resulting skus in a array
        const insufficientStockSkus = items
            .filter((item) => {
                    const variant = variantBySku.get(item.sku);
                    if (!variant) throw new Error(`No variant found for SKU: ${item.sku}`);
                    return item.quantity > variant.inventory_count;
                }
            )
            .map((item) => item.sku);
        if (insufficientStockSkus.length > 0) {
            res.status(400).json({ error: `Insufficient inventory for sku(s): ${insufficientStockSkus.join(", ")}` });
            return;
        }

        //Map items into an array of objects to pass to Stripe
        const line_items = items.map((item) => {
            const variant = variantBySku.get(item.sku);
            if (!variant) throw new Error(`No variant found for SKU: ${item.sku}`);
            return {
                price: variant.price_id,
                quantity: item.quantity,
            }
        });

        //Pass object into stripe sessions object
        const session = await stripe.checkout.sessions.create({
            line_items,
            mode: 'payment',
            success_url: `${successPage}?success=true`
        });

        if (!session.url) {
            res.status(500).json({ error: "Failed to create checkout session" });
            return;
        }

        res.json({ url: session.url });
    } catch (error) {
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
});

export default router;