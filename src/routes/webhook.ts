import express from "express";
import connection from "../mysql.js";
import Stripe from "stripe";

const router = express.Router();

const secret = process.env.SECRET;
if (!secret) throw new Error('Missing SECRET');


router.route("/").post(async (req, res) => {
    let event;

    // Get the signature sent by Stripe
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).send('Missing stripe-signature header');
    }

    try {
        event = Stripe.webhooks.constructEvent(req.body, signature, secret);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`Webhook signature verification failed.`, message);
        return res.sendStatus(400);
    }
    
});

export default router;