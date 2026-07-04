import express from "express";
import db from "../mysql";
import { calculateArchetype } from "../utils/algorithms.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM users");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE user_id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "User not found" });

        const user = rows[0];
        user.personality_archetype = calculateArchetype(user);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;