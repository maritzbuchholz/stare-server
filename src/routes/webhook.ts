import express from "express";
import connection from "../mysql.js";

const router = express.Router();

router.route("/").post(async (req, res) => {
})

export default router;