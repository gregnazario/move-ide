import type { languages } from "monaco-editor";

export const tomlLanguageConfig: languages.IMonarchLanguage = {
    defaultToken: "",
    tokenPostfix: ".toml",
    tokenizer: {
        root: [
            { include: "@whitespace" },
            [/\[[^\]]+\]/, "type.identifier"],
            [/^[A-Za-z0-9_\-.]+(?=\s*=)/, "identifier"],
            [/=|,/, "delimiter"],
            [/[+-]?\d+(\.\d+)?([eE][+-]?\d+)?/, "number"],
            [/\b(true|false)\b/, "keyword"],
            [/".*?"/, "string"],
            [/'.*?'/, "string"],
        ],
        whitespace: [
            [/[ \t\r\n]+/, "white"],
            [/#.*$/, "comment"],
        ],
    },
};

export const tomlLanguageConfiguration: languages.LanguageConfiguration = {
    comments: {
        lineComment: "#",
    },
    brackets: [
        ["[", "]"],
        ["{", "}"],
    ],
    autoClosingPairs: [
        { open: "[", close: "]" },
        { open: "{", close: "}" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
    ],
};
