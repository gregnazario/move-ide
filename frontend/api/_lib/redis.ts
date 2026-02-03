import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function getRedis() {
    if (!client) {
        client = Redis.fromEnv();
    }
    return client;
}
