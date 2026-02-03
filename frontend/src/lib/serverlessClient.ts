import type { ExecutePayload, ServerMessage } from "../types/execute";

async function ensureAuth(): Promise<void> {
    const response = await fetch("/api/auth/issue", {
        method: "POST",
        credentials: "include",
    });
    if (!response.ok) {
        throw new Error("Failed to refresh auth");
    }
}

export async function startExecution(payload: ExecutePayload) {
    let response = await fetch("/api/execute/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (response.status === 401 || response.status === 403) {
        await ensureAuth();
        response = await fetch("/api/execute/start", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    }

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to start execution");
    }

    const data = await response.json();
    return data.execution_id as string;
}

export function streamExecution(
    executionId: string,
    onMessage: (message: ServerMessage, cursor: number) => void,
    onDone: () => void,
    onError: (error: Error) => void,
    startCursor = -1,
) {
    const url = `/api/execute/events?id=${encodeURIComponent(
        executionId,
    )}&cursor=${startCursor}`;

    const source = new EventSource(url, { withCredentials: true });

    source.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data) as {
                cursor: number;
                message: ServerMessage;
            };
            onMessage(parsed.message, parsed.cursor);
        } catch (err) {
            onError(err as Error);
        }
    };

    source.onerror = () => {
        source.close();
        onDone();
    };

    return () => {
        source.close();
    };
}

export async function pollExecution(
    executionId: string,
    cursor: number,
): Promise<{ events: ServerMessage[]; nextCursor: number; status?: string }> {
    const response = await fetch(
        `/api/execute/status?id=${encodeURIComponent(
            executionId,
        )}&cursor=${cursor}`,
        { credentials: "include" },
    );

    if (response.status === 401 || response.status === 403) {
        await ensureAuth();
        return pollExecution(executionId, cursor);
    }

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to poll execution");
    }

    const data = await response.json();
    return {
        events: data.events as ServerMessage[],
        nextCursor: data.next_cursor as number,
        status: data.status as string | undefined,
    };
}
