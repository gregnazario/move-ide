export type PathValidationResult =
    | { ok: true; normalized: string }
    | { ok: false; message: string };

const INVALID_ABSOLUTE = "Absolute paths are not allowed";
const INVALID_TRAVERSAL = "Path traversal is not allowed";
const INVALID_HIDDEN = "Hidden folders are not allowed";
const INVALID_APTOS = "The .aptos folder is not allowed";
const INVALID_EMPTY = "Path cannot be empty";
const INVALID_EXTENSION = "Only .move files are allowed";
const INVALID_MOVE_TOML = "Move.toml cannot be renamed or created";

const normalizeSlashes = (value: string) => value.replace(/\\/g, "/");

const splitSegments = (value: string) =>
    value.split("/").filter((segment) => segment.length > 0);

const hasHiddenSegment = (segments: string[]) =>
    segments.some((segment) => segment.startsWith("."));

export const normalizePath = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }
    const normalized = normalizeSlashes(trimmed);
    return normalized.replace(/\/{2,}/g, "/").replace(/\/+$/g, "");
};

export const validateFolderPath = (value: string): PathValidationResult => {
    const normalized = normalizePath(value);
    if (!normalized) {
        return { ok: false, message: INVALID_EMPTY };
    }
    if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
        return { ok: false, message: INVALID_ABSOLUTE };
    }
    if (normalized.includes("..")) {
        return { ok: false, message: INVALID_TRAVERSAL };
    }
    const segments = splitSegments(normalized);
    if (hasHiddenSegment(segments)) {
        if (segments.some((segment) => segment === ".aptos")) {
            return { ok: false, message: INVALID_APTOS };
        }
        return { ok: false, message: INVALID_HIDDEN };
    }
    return { ok: true, normalized };
};

export const validateFilePath = (value: string): PathValidationResult => {
    const normalized = normalizePath(value);
    if (!normalized) {
        return { ok: false, message: INVALID_EMPTY };
    }
    if (normalized === "Move.toml") {
        return { ok: false, message: INVALID_MOVE_TOML };
    }
    if (!normalized.endsWith(".move")) {
        return { ok: false, message: INVALID_EXTENSION };
    }
    const folderResult = validateFolderPath(normalized);
    if (!folderResult.ok) {
        return folderResult;
    }
    return { ok: true, normalized };
};
