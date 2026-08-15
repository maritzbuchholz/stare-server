import "dotenv/config";
import cors from "cors";
import express from "express";

import checkout from "./routes/create-checkout-session.js";
import products from "./routes/products.js";
// import orders from "./routes/orders";
// import order_items from "./routes/order_items";


const port = process.env.PORT;
const app = express();

app.use(cors());
app.use(express.json()); // allows parsing JSON data from req objects

app.use("/products", products);
app.use("/create-checkout-session", checkout);
// app.use("/orders", orders);
// app.use("/order_items", order_items);

app.listen(port, () => { console.log(`Listening on ${port} ?? 3000`); });