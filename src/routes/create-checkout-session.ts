import express from "express";
import connection from "../mysql.js";
import Stripe from "stripe";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_KEY as string);

router.route("/create-checkout-session").post(async (req, res) => {
    const session = await stripe.checkout.sessions.create({

    })

    // try {
    //     res.json(results);
    // } catch (error) {
    //     console.log(error);
    //     res.status(500).send("Error occured on the server");
    // }
})

export default router;