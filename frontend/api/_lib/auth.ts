import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT, jwtVerify } from "jose";

const ISSUER = "move-playground";
const AUDIENCE = "move-playground-backend";
const COOKIE_NAME = "mp_auth";

const textEncoder = new TextEncoder();

function getSecret() {
    return textEncoder.encode(process.env.AUTH_JWT_SECRET ?? "dev-secret");
}

function getAllowedOrigins(): string[] {
    const raw =
        process.env.FRONTEND_ORIGINS ??
        process.env.PLAYGROUND_FRONTEND_ORIGINS ??
        "http://localhost:3000";
    return raw
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

export function getRequestOrigin(req: VercelRequest): string | null {
    const origin = req.headers?.origin;
    if (origin) return origin;

    const referer = req.headers?.referer;
    if (!referer) return null;

    const parts = String(referer).split("/");
    if (parts.length < 3) return null;
    return `${parts[0]}//${parts[2]}`;
}

export function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;
    return getAllowedOrigins().some((allowed) => allowed === origin);
}

export async function issueToken(origin: string) {
    const secret = getSecret();
    const jwt = await new SignJWT({ origin, jti: randomUUID() })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime("5m")
        .sign(secret);
    return jwt;
}

export async function verifyToken(token: string, origin: string) {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, {
        issuer: ISSUER,
        audience: AUDIENCE,
    });

    if (payload.origin !== origin) {
        throw new Error("Origin mismatch");
    }

    return payload;
}

export function getAuthCookie(req: VercelRequest): string | null {
    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader) return null;
    const parts = String(cookieHeader).split(";");
    for (const part of parts) {
        const [key, value] = part.trim().split("=");
        if (key === COOKIE_NAME && value) {
            return value;
        }
    }
    return null;
}

export function buildAuthCookie(token: string, origin: string) {
    const cookieParts = [
        `${COOKIE_NAME}=${token}`,
        "HttpOnly",
        "Path=/",
        "SameSite=Strict",
        "Max-Age=300",
    ];

    if (origin.startsWith("https://")) {
        cookieParts.push("Secure");
    }

    const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
    if (domain) {
        cookieParts.push(`Domain=${domain}`);
    }

    return cookieParts.join("; ");
}

export async function requireAuth(req: VercelRequest, res: VercelResponse) {
    const origin = getRequestOrigin(req);
    if (!origin || !isOriginAllowed(origin)) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "Origin not allowed" }));
        return null;
    }

    const token = getAuthCookie(req);
    if (!token) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "Missing auth cookie" }));
        return null;
    }

    try {
        await verifyToken(token, origin);
    } catch {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "Invalid auth token" }));
        return null;
    }

    return origin;
}
