import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceStore } from "./workspace";

describe("workspace store", () => {
    beforeEach(() => {
        useWorkspaceStore.getState().reset();
    });

    it("creates a file and activates it", () => {
        const path = "sources/new.move";
        useWorkspaceStore.getState().createFile(path, "module foo {}");

        const state = useWorkspaceStore.getState();
        expect(state.files.has(path)).toBe(true);
        expect(state.activeFile).toBe(path);
        expect(state.openTabs).toContain(path);
    });

    it("renames a file and keeps it active", () => {
        const oldPath = "sources/old.move";
        const newPath = "sources/new.move";

        useWorkspaceStore.getState().createFile(oldPath, "module old {}");
        useWorkspaceStore.getState().renameFile(oldPath, newPath);

        const state = useWorkspaceStore.getState();
        expect(state.files.has(oldPath)).toBe(false);
        expect(state.files.has(newPath)).toBe(true);
        expect(state.activeFile).toBe(newPath);
    });

    it("deletes a file and updates tabs", () => {
        const path = "sources/delete.me";
        useWorkspaceStore.getState().createFile(path, "module delete {}");
        useWorkspaceStore.getState().deleteFile(path);

        const state = useWorkspaceStore.getState();
        expect(state.files.has(path)).toBe(false);
        expect(state.openTabs).not.toContain(path);
        expect(state.activeFile).not.toBe(path);
    });
});
