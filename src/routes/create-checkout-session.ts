import express from "express";
import Stripe from "stripe";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_KEY!);

router.route("/create-checkout-session").post(async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: 'price_1U3ParCnsumT0OCqQ5c6STZ9',
                quantity: 1,
            },            
        ]
    })

    // try {
    //     res.json(results);
    // } catch (error) {
    //     console.log(error);
    //     res.status(500).send("Error occured on the server");
    // }
})

export default router;