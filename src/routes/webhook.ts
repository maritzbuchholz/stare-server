import express from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import Stripe from "stripe";

import connection from "../mysql.js";
import { isNonEmptyString } from "../utils/validation.js";

const router = express.Router();

const secret = process.env.SECRET;
if (!secret) throw new Error('Missing SECRET');


router.route("/").post(async (req, res) => {
    let event: Stripe.Event;

    // Get the signature sent by Stripe
    const signature = req.headers['stripe-signature'];
    if (!isNonEmptyString(signature)) {
        return res.status(400).send('Missing stripe-signature header');
    }

    try {
        event = Stripe.webhooks.constructEvent(req.body as Buffer, signature, secret);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`Webhook signature verification failed.`, message);
        return res.sendStatus(400);
    }
    
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const email = session.customer_details?.email ?? null;
            const shippingAddress = JSON.stringify(
                session.collected_information?.shipping_details?.address ?? null
            );

            const db = await connection.getConnection();
            try {
                await db.beginTransaction();

                // Only a pending order can become paid, so a duplicate delivery matches no rows
                // and skips the decrement below (Stripe retries webhooks)
                const [result] = await db.query<ResultSetHeader>(
                    `UPDATE orders SET status = 'paid', email = ?, shipping_address = ? WHERE stripe_session_id = ? AND status = 'payment_pending'`,
                    [email, shippingAddress, session.id]
                );

                if (result.affectedRows > 0) {
                    const [items] = await db.query<RowDataPacket[]>(
                        `SELECT oi.product_variant_id, oi.quantity
                         FROM order_items oi
                         JOIN orders o ON o.id = oi.order_id
                         WHERE o.stripe_session_id = ?`,
                        [session.id]
                    );

                    // GREATEST keeps the count at 0 if stock ran out between checkout and payment,
                    // so the paid status is still recorded instead of failing the CHECK constraint
                    for (const item of items) {
                        await db.query(
                            `UPDATE product_variants SET inventory_count = GREATEST(inventory_count - ?, 0) WHERE id = ?`,
                            [item.quantity, item.product_variant_id]
                        );
                    }
                }

                await db.commit();
            } catch (err) {
                await db.rollback();
                console.log(`Failed to update order for session ${session.id}`, err);
                res.sendStatus(500);
                return;
            } finally {
                db.release();
            }
            break;
        }
        case 'checkout.session.expired': {
            const session = event.data.object;

            try {
                await connection.query(
                    `UPDATE orders SET status = 'payment_cancelled' WHERE stripe_session_id = ?`,
                    [session.id]
                );
            } catch (err) {
                console.log(`Failed to update order for session ${session.id}`, err);
                res.sendStatus(500);
                return;
            }
            break;
        }
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({received: true});

});

export default router;