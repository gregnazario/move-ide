declare module "monaco-vim" {
    import type { editor } from "monaco-editor";

    export function initVimMode(
        editorInstance: editor.IStandaloneCodeEditor,
        statusBarElement?: HTMLElement | null,
    ): { dispose: () => void };
}
