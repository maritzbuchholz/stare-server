import express from "express";
import connection from "../mysql.js";

const router = express.Router();

const secret = process.env.SECRET
if (!secret) throw new Error('Missing SECRET');


router.route("/").post(async (req, res) => {
})

export default router;