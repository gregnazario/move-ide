import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
    buildAuthCookie,
    getRequestOrigin,
    isOriginAllowed,
    issueToken,
} from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
    }

    const origin = getRequestOrigin(req);
    if (!origin || !isOriginAllowed(origin)) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "Origin not allowed" }));
        return;
    }

    const token = await issueToken(origin);
    const cookie = buildAuthCookie(token, origin);

    res.setHeader("Set-Cookie", cookie);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
}
