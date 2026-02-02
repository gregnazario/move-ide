import type { languages } from "monaco-editor";

export const moveLanguageConfig: languages.IMonarchLanguage = {
    defaultToken: "",
    tokenPostfix: ".move",

    keywords: [
        "module",
        "script",
        "struct",
        "public",
        "fun",
        "entry",
        "native",
        "has",
        "key",
        "store",
        "drop",
        "copy",
        "let",
        "mut",
        "if",
        "else",
        "while",
        "loop",
        "return",
        "abort",
        "break",
        "continue",
        "move",
        "use",
        "as",
        "friend",
        "const",
        "spec",
        "schema",
        "invariant",
        "acquires",
        "address",
        "phantom",
        "inline",
    ],

    typeKeywords: [
        "u8",
        "u16",
        "u32",
        "u64",
        "u128",
        "u256",
        "bool",
        "address",
        "signer",
        "vector",
    ],

    operators: [
        "=",
        ">",
        "<",
        "!",
        "~",
        "?",
        ":",
        "==",
        "<=",
        ">=",
        "!=",
        "&&",
        "||",
        "++",
        "--",
        "+",
        "-",
        "*",
        "/",
        "&",
        "|",
        "^",
        "%",
        "<<",
        ">>",
        "+=",
        "-=",
        "*=",
        "/=",
        "&=",
        "|=",
        "^=",
        "%=",
        "<<=",
        ">>=",
        "=>",
        "->",
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    escapes:
        /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
        root: [
            // Identifiers and keywords
            [
                /[a-z_$][\w$]*/,
                {
                    cases: {
                        "@typeKeywords": "type",
                        "@keywords": "keyword",
                        "@default": "identifier",
                    },
                },
            ],
            [/[A-Z][\w\$]*/, "type.identifier"],

            // Whitespace
            { include: "@whitespace" },

            // Delimiters and operators
            [/[{}()\[\]]/, "@brackets"],
            [/[<>](?!@symbols)/, "@brackets"],
            [
                /@symbols/,
                {
                    cases: {
                        "@operators": "operator",
                        "@default": "",
                    },
                },
            ],

            // Numbers
            [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
            [/0[xX][0-9a-fA-F]+/, "number.hex"],
            [/\d+/, "number"],

            // Delimiter: after number because of .\d floats
            [/[;,.]/, "delimiter"],

            // Strings
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
            [
                /b"/,
                {
                    token: "string.quote",
                    bracket: "@open",
                    next: "@bytestring",
                },
            ],

            // Characters
            [/'[^\\']'/, "string"],
            [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
            [/'/, "string.invalid"],
        ],

        comment: [
            [/[^\/*]+/, "comment"],
            [/\/\*/, "comment", "@push"],
            ["\\*/", "comment", "@pop"],
            [/[\/*]/, "comment"],
        ],

        string: [
            [/[^\\"]+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
        ],

        bytestring: [
            [/[^\\"]+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
        ],

        whitespace: [
            [/[ \t\r\n]+/, "white"],
            [/\/\*/, "comment", "@comment"],
            [/\/\/.*$/, "comment"],
        ],
    },
};
