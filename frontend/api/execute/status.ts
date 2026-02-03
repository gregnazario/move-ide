import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib/auth";
import { getRedis } from "../_lib/redis";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "GET") {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
    }

    const origin = await requireAuth(req, res);
    if (!origin) return;

    const executionId = req.query?.id as string | undefined;
    if (!executionId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing id" }));
        return;
    }

    const redis = getRedis();
    const statusKey = `exec:${executionId}`;
    const eventsKey = `exec:${executionId}:events`;

    let cursor = Number(req.query?.cursor ?? -1);
    if (Number.isNaN(cursor) || cursor < -1) cursor = -1;

    const start = cursor + 1;
    const items = await redis.lrange<string[]>(eventsKey, start, -1);
    const status = await redis.hget<string>(statusKey, "status");

    const events = items.map((item) => JSON.parse(item));
    const nextCursor = cursor + items.length;

    res.statusCode = 200;
    res.end(
        JSON.stringify({
            status,
            events,
            next_cursor: nextCursor,
        }),
    );
}
