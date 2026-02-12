import { randomUUID } from "node:crypto";
import { requireAuth } from "../_lib/auth.js";
import { type ExecutePayload, runExecution } from "../_lib/exec.js";
import { getRedis } from "../_lib/redis.js";
import type { VercelRequest, VercelResponse } from "../_lib/types.js";

const TTL_SECONDS = 60 * 60;

function readJson(req: VercelRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk: Buffer) => {
            data += chunk.toString();
        });
        req.on("end", () => {
            if (!data) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (err) {
                reject(err);
            }
        });
    });
}

async function runAndPersistExecution(
    payload: ExecutePayload,
    executionId: string,
) {
    const redis = getRedis();
    const statusKey = `exec:${executionId}`;
    const eventsKey = `exec:${executionId}:events`;

    try {
        const result = await runExecution(
            payload,
            async (data) => {
                await redis.rpush(
                    eventsKey,
                    JSON.stringify({ type: "stdout", payload: { data } }),
                );
            },
            async (data) => {
                await redis.rpush(
                    eventsKey,
                    JSON.stringify({ type: "stderr", payload: { data } }),
                );
            },
        );

        const doneEvent = {
            type: "done",
            payload: {
                success: result.exitCode === 0,
                exit_code: result.exitCode,
                duration_ms: result.durationMs,
                compiled_package: null,
                publish_payload: result.publishPayload ?? null,
            },
        };

        await redis.rpush(eventsKey, JSON.stringify(doneEvent));
        await redis.hset(statusKey, {
            status: "done",
            exit_code: result.exitCode,
            duration_ms: result.durationMs,
            updated_at: Date.now(),
        });
        await redis.expire(statusKey, TTL_SECONDS);
        await redis.expire(eventsKey, TTL_SECONDS);
    } catch (err) {
        const failedEvent = {
            type: "failed",
            payload: { message: (err as Error).message ?? "Execution failed" },
        };
        await redis.rpush(eventsKey, JSON.stringify(failedEvent));
        await redis.hset(statusKey, {
            status: "failed",
            error_message: (err as Error).message ?? "Execution failed",
            updated_at: Date.now(),
        });
        await redis.expire(statusKey, TTL_SECONDS);
        await redis.expire(eventsKey, TTL_SECONDS);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
    }

    const origin = await requireAuth(req, res);
    if (!origin) return;

    let payload: ExecutePayload;
    try {
        payload = (await readJson(req)) as ExecutePayload;
    } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
    }

    const executionId = randomUUID();
    const redis = getRedis();
    const statusKey = `exec:${executionId}`;
    const eventsKey = `exec:${executionId}:events`;

    const startedEvent = {
        type: "started",
        payload: {
            execution_id: executionId,
            command: payload.command,
        },
    };

    await redis.hset(statusKey, {
        status: "running",
        command: payload.command,
        started_at: Date.now(),
        updated_at: Date.now(),
    });
    await redis.rpush(eventsKey, JSON.stringify(startedEvent));
    await redis.expire(statusKey, TTL_SECONDS);
    await redis.expire(eventsKey, TTL_SECONDS);

    await runAndPersistExecution(payload, executionId);

    res.statusCode = 200;
    res.end(JSON.stringify({ execution_id: executionId }));
}
