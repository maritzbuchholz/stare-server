import type { RequestHandler } from "express";

import { timingSafeEqual } from "node:crypto";

const apiKey = process.env.ADMIN_API_KEY;
if (!apiKey) throw new Error('Missing ADMIN_API_KEY');
const expected = Buffer.from(apiKey);

// Rejects the request unless the x-api-key header matches ADMIN_API_KEY
// timingSafeEqual stops attackers guessing the key one character at a time from response times
export const requireApiKey: RequestHandler = (req, res, next) => {
    const provided = Buffer.from(req.get("x-api-key") ?? "");

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
        res.status(401).send("Missing or invalid API key");
        return;
    }
    next();
};
