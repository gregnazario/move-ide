import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib/auth";
import { getRedis } from "../_lib/redis";

const POLL_INTERVAL_MS = 1000;
const MAX_STREAM_MS = 25_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.statusCode = 405;
        res.end("Method not allowed");
        return;
    }

    const origin = await requireAuth(req, res);
    if (!origin) return;

    const executionId = req.query?.id as string | undefined;
    if (!executionId) {
        res.statusCode = 400;
        res.end("Missing id");
        return;
    }

    const redis = getRedis();
    const statusKey = `exec:${executionId}`;
    const eventsKey = `exec:${executionId}:events`;

    let cursor = Number(req.query?.cursor ?? -1);
    if (Number.isNaN(cursor) || cursor < -1) cursor = -1;

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });

    const startedAt = Date.now();

    const sendEvents = async () => {
        const start = cursor + 1;
        const items = await redis.lrange<string[]>(eventsKey, start, -1);
        items.forEach((item, index) => {
            const eventCursor = start + index;
            const payload = JSON.stringify({
                cursor: eventCursor,
                message: JSON.parse(item),
            });
            res.write(`data: ${payload}\n\n`);
            cursor = eventCursor;
        });

        const status = await redis.hget<string>(statusKey, "status");
        if ((status === "done" || status === "failed") && items.length === 0) {
            res.end();
            return;
        }

        if (Date.now() - startedAt > MAX_STREAM_MS) {
            res.end();
            return;
        }

        setTimeout(sendEvents, POLL_INTERVAL_MS);
    };

    void sendEvents();
}
