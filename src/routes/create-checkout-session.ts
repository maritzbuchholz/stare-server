import express from "express";
import Stripe from "stripe";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_KEY!);

const successPage = "https://github.com/maritzbuchholz?tab=repositories";

router.route("/create-checkout-session").post(async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: 'price_1U3ParCnsumT0OCqQ5c6STZ9',
                quantity: 1,
            },            
        ],
        mode: 'payment',
        success_url: `${successPage}?success=true`
    });

    if (!session.url) {
        res.status(500).json({ error: "Failed to create checkout session" });
        return;
    }
    
    res.redirect(303, session.url);
    
});

export default router;