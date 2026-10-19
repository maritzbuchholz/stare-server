import "dotenv/config";
import cors from "cors";
import express from "express";

import checkout from "./routes/create-checkout-session.js";
import orders from "./routes/orders.js";
import products from "./routes/products.js";
import webhook from "./routes/webhook.js";
// import order_items from "./routes/order_items";


const port = process.env.PORT;
if (!port) throw new Error('Missing PORT');
const app = express();

app.use(cors());

// Webhook route needs the raw body for Stripe signature verification —
// must be mounted BEFORE express.json() so the JSON parser never touches it
app.use("/webhook", express.raw({ type: "application/json" }), webhook);

app.use(express.json()); // allows parsing JSON data from req objects

app.use("/products", products);
app.use("/create-checkout-session", checkout);
app.use("/orders", orders);
// app.use("/order_items", order_items);

app.listen(port, () => { console.log(`Listening on ${port}`); });