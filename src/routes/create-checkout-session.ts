import express from "express";
import Stripe from "stripe";

import connection from "../mysql.js";
import { isNonEmptyString, isPositiveInt } from "../utils/validation.js";

const router = express.Router();

const confirm = process.env.CONFIRM
if (!confirm) throw new Error('Missing CONFIRM');
const successPage = confirm;

const stripeKey = process.env.STRIPE_KEY;
if (!stripeKey) throw new Error('Missing STRIPE_KEY');
const stripe = new Stripe(stripeKey);

//One item of the cart once it has passed both checks below
interface CartItem {
    quantity: number;
    sku: string;
}

//Check 1: the item is an object with a sku to look up
const hasSku = (item: unknown): item is { quantity?: unknown; sku: string } =>
    typeof item === "object" && item !== null && "sku" in item && isNonEmptyString(item.sku);

//Check 2: its quantity is a whole number of 1 or more
const hasValidQuantity = (item: { quantity?: unknown; sku: string }): item is CartItem =>
    isPositiveInt(item.quantity);

router.route("/").post(async (req, res) => {
    //req.body is undefined when the request has no JSON body, so fall back to an empty object
    const { items } = (req.body ?? {}) as { items?: unknown };

    //if items is missing, not an array, or empty, return error message to client
    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "No items provided" });
        return;
    }

    //Return an error message to the client if any item is not an object with a sku
    if (!items.every(hasSku)) {
        res.status(400).json({ error: "Each item must have a sku" });
        return;
    }

    //If any quantity is not an integer OR is not positive, map the skus of those items to a new array
    //and return them in an error message to the client
    if (!items.every(hasValidQuantity)) {
        const invalidQuantitySkus = items
            .filter((item) => !hasValidQuantity(item))
            .map((item) => item.sku);
        res.status(400).json({ error: `Invalid quantity for sku(s): ${invalidQuantitySkus.join(", ")}` });
        return;
    }

    try {
        //Create an array of skus
        const skus = items.map((item) => item.sku);

        //select variant + product info needed both for the stripe line items and the order_items rows
        const sql = `
        SELECT v.id, v.size, v.sku, v.price_id, v.inventory_count, p.name AS product_name, p.price_cents
        FROM product_variants v
        JOIN products p ON p.id = v.product_id
        WHERE v.sku IN (?)
        `;

        //Wrapping [skus] - the first ? placeholder gets replaced with this whole array
        //Then, deconstructing [row, fields] tuple into single array of objects; row is target data and fields is metadata
        const [rows] = await connection.query(sql, [skus]);

        //Confirms shape of mysql pull as compile-time check
        const variants = rows as {
            id: number;
            inventory_count: number;
            price_cents: number;
            price_id: string;
            product_name: string;
            size: string;
            sku: string;
        }[];

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
            expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
            line_items,
            mode: 'payment',
            payment_method_types: ['card'],
            shipping_address_collection: {
                allowed_countries: ['US', 'CA'], // whichever countries you ship to
            },
            success_url: `${successPage}?success=true`
        });

        if (!session.url) {
            res.status(500).json({ error: "Failed to create checkout session" });
            return;
        }

        //Price each item from the DB (not client input) to build the order_items rows
        const orderItemRows = items.map((item) => {
            const variant = variantBySku.get(item.sku);
            if (!variant) throw new Error(`No variant found for SKU: ${item.sku}`);
            return {
                line_total_cents: variant.price_cents * item.quantity,
                product_name: variant.product_name,
                product_sku: variant.sku,
                product_variant_id: variant.id,
                quantity: item.quantity,
                unit_price_cents: variant.price_cents,
                variant_size: variant.size,
            };
        });
        const totalCents = orderItemRows.reduce((sum, row) => sum + row.line_total_cents, 0);

        //Record the order as pending; the webhook flips it to 'paid' once Stripe confirms payment
        const db = await connection.getConnection();
        try {
            await db.beginTransaction();

            const [orderResult] = await db.query(
                `INSERT INTO orders (status, total_cents, stripe_session_id) VALUES ('payment_pending', ?, ?)`,
                [totalCents, session.id]
            );
            const orderId = (orderResult as { insertId: number }).insertId;

            const orderItemsValues = orderItemRows.map((row) => [
                orderId,
                row.product_variant_id,
                row.product_name,
                row.variant_size,
                row.product_sku,
                row.unit_price_cents,
                row.quantity,
                row.line_total_cents,
            ]);
            await db.query(
                `INSERT INTO order_items
                (order_id, product_variant_id, product_name, variant_size, product_sku, unit_price_cents, quantity, line_total_cents)
                VALUES ?`,
                [orderItemsValues]
            );

            await db.commit();
        } catch (dbError) {
            await db.rollback();
            await stripe.checkout.sessions.expire(session.id).catch(console.error);
            throw dbError;
        } finally {
            db.release();
        }

        res.json({ url: session.url });
    } catch (error) {
        console.log(error);
        res.status(500).send("Error occured on the server");
    }
});

export default router;