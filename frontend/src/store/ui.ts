import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type ThemeMode = "light" | "dark" | "system";
export type Theme = "light" | "dark";
export type KeybindingMode = "default" | "vim";

interface UiState {
    themeMode: ThemeMode;
    theme: Theme;
    keybindingMode: KeybindingMode;

    initTheme: () => void;
    setThemeMode: (mode: ThemeMode) => void;
    syncSystemTheme: () => void;
    setKeybindingMode: (mode: KeybindingMode) => void;
}

const STORAGE_KEY = "move-theme-mode";
const KEYBINDING_STORAGE_KEY = "move-keybinding-mode";

const getSystemTheme = (): Theme => {
    if (typeof window === "undefined" || !window.matchMedia) {
        return "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
};

const computeTheme = (mode: ThemeMode): Theme =>
    mode === "system" ? getSystemTheme() : mode;

const applyTheme = (theme: Theme) => {
    if (typeof document !== "undefined") {
        document.documentElement.dataset.theme = theme;
    }
};

const readStoredMode = (): ThemeMode => {
    if (typeof window === "undefined") {
        return "dark";
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
    }
    return "dark";
};

const readStoredKeybindingMode = (): KeybindingMode => {
    if (typeof window === "undefined") {
        return "default";
    }
    const stored = window.localStorage.getItem(KEYBINDING_STORAGE_KEY);
    if (stored === "default" || stored === "vim") {
        return stored;
    }
    return "default";
};

export const useUiStore = create<UiState>()(
    immer((set, get) => ({
        themeMode: "dark",
        theme: "dark",
        keybindingMode: "default",

        initTheme: () => {
            const mode = readStoredMode();
            const theme = computeTheme(mode);
            const keybindingMode = readStoredKeybindingMode();
            applyTheme(theme);
            set((state) => {
                state.themeMode = mode;
                state.theme = theme;
                state.keybindingMode = keybindingMode;
            });
        },

        setThemeMode: (mode) => {
            const theme = computeTheme(mode);
            applyTheme(theme);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(STORAGE_KEY, mode);
            }
            set((state) => {
                state.themeMode = mode;
                state.theme = theme;
            });
        },

        syncSystemTheme: () => {
            const mode = get().themeMode;
            if (mode !== "system") return;
            const theme = computeTheme(mode);
            applyTheme(theme);
            set((state) => {
                state.theme = theme;
            });
        },

        setKeybindingMode: (mode) => {
            if (typeof window !== "undefined") {
                window.localStorage.setItem(KEYBINDING_STORAGE_KEY, mode);
            }
            set((state) => {
                state.keybindingMode = mode;
            });
        },
    })),
);
