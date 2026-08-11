// import express from "express";
// import connection from "../mysql.js";
// import stripe from "stripe";
// import { v4 as uuidv4 } from 'uuid';

// const router = express.Router();

// router.route("/create-checkout-session").post(async (req, res) => {
//     const session = await stripe.checkout.session.create

//     try {
//         const [results] = await connection.query(sql);
//         res.json(results);
//     } catch (error) {
//         console.log(error);
//         res.status(500).send("Error occured on the server");
//     }
// })

// export default router;