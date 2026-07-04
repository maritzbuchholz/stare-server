import "dotenv/config";
import cors from "cors";
import express from "express";
import products from "./routes/products";
// import orders from "./routes/orders";
// import order_items from "./routes/order_items";


const port = process.env.PORT;
const app = express();

app.use(cors());
app.use(express.json()); // allows parsing JSON data from req objects

app.use("/products", products);
// app.use("/orders", orders);
// app.use("/order_items", order_items);

app.listen(port, () => console.log(`Listening on ${port}`));