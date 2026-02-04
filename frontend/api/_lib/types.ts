import type {
    IncomingHttpHeaders,
    IncomingMessage,
    ServerResponse,
} from "node:http";

export type VercelRequest = IncomingMessage & {
    headers: IncomingHttpHeaders;
    method?: string;
    query?: Record<string, string | string[]>;
    on: IncomingMessage["on"];
};

export type VercelResponse = ServerResponse & {
    statusCode: number;
    setHeader: (name: string, value: string) => void;
    end: (body?: string) => void;
    writeHead: (statusCode: number, headers: Record<string, string>) => void;
    write: (chunk: string) => void;
};
