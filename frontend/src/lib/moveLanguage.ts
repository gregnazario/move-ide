import type { languages } from "monaco-editor";

export const moveLambdaStartRegex = /\|(?!\|)(?=[ \t]*(?:&mut\b|&)?[A-Za-z_])/;

export const moveLanguageConfig: languages.IMonarchLanguage = {
    defaultToken: "",
    tokenPostfix: ".move",

    keywords: [
        "abort",
        "acquires",
        "as",
        "assert",
        "break",
        "const",
        "continue",
        "copy",
        "drop",
        "else",
        "entry",
        "enum",
        "for",
        "friend",
        "fun",
        "has",
        "if",
        "in",
        "inline",
        "invariant",
        "is",
        "key",
        "let",
        "loop",
        "macro",
        "match",
        "module",
        "move",
        "mut",
        "native",
        "package",
        "phantom",
        "public",
        "receiver",
        "return",
        "schema",
        "script",
        "spec",
        "store",
        "struct",
        "use",
        "while",
    ],

    abilities: ["copy", "drop", "key", "store"],

    literals: ["true", "false"],

    builtinConstants: [
        "__COMPILE_FOR_TESTING__",
        "MAX_U8",
        "MAX_U16",
        "MAX_U32",
        "MAX_U64",
        "MAX_U128",
        "MAX_U256",
        "MAX_I8",
        "MAX_I16",
        "MAX_I32",
        "MAX_I64",
        "MAX_I128",
        "MAX_I256",
        "MIN_I8",
        "MIN_I16",
        "MIN_I32",
        "MIN_I64",
        "MIN_I128",
        "MIN_I256",
    ],

    builtinFunctions: [
        "assert",
        "borrow_global",
        "borrow_global_mut",
        "exists",
        "move_from",
        "move_to",
        "freeze",
    ],

    typeKeywords: [
        "u8",
        "u16",
        "u32",
        "u64",
        "u128",
        "u256",
        "i8",
        "i16",
        "i32",
        "i64",
        "i128",
        "i256",
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
        "::",
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    escapes:
        /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
        root: [
            // Attributes/annotations – handle nested parens e.g. #[expected_failure(abort_code = 1)]
            [/#\[/, { token: "annotation", next: "@attribute" }],

            // Loop labels  e.g. 'outer
            [/'[a-zA-Z_][\w$]*/, "tag"],

            // Lambda parameters (|x, y| ...)
            [
                moveLambdaStartRegex,
                { token: "operator", next: "@lambdaParams" },
            ],

            // Builtin constants
            [/\b__COMPILE_FOR_TESTING__\b/, "constant"],
            [/\bMAX_[UI]\d+\b/, "constant"],
            [/\bMIN_I\d+\b/, "constant"],

            // Address literals  @0x1, @aptos_framework
            [/@0[xX][0-9a-fA-F_]+/, "number.hex"],
            [/@[a-zA-Z_][\w_]*/, "constant"],

            // Macro invocations: assert!(...), abort!(...)
            [/[a-z_$][\w$]*!/, "support.function"],

            // Identifiers and keywords – specific keywords trigger sub-states
            [
                /[a-z_$][\w$]*/,
                {
                    cases: {
                        fun: { token: "keyword", next: "@functionDef" },
                        struct: { token: "keyword", next: "@typeDef" },
                        enum: { token: "keyword", next: "@typeDef" },
                        module: { token: "keyword", next: "@moduleDef" },
                        has: { token: "keyword", next: "@abilityList" },
                        self: "variable.predefined",
                        "@typeKeywords": "type",
                        "@literals": "constant",
                        "@keywords": "keyword",
                        "@default": "identifier",
                    },
                },
            ],

            // Type identifiers (PascalCase) and Self
            [
                /[A-Z][\w$]*/,
                {
                    cases: {
                        "@builtinConstants": "constant",
                        Self: "keyword",
                        "@default": "type.identifier",
                    },
                },
            ],

            // Whitespace
            { include: "@whitespace" },

            // Delimiters and operators
            [/[{}()\[\]]/, "@brackets"],
            [/[<>](?!@symbols)/, "@brackets"],
            [/\.{2}/, "operator"],
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
            [
                /0[xX][0-9a-fA-F_]+(?:u8|u16|u32|u64|u128|u256|i8|i16|i32|i64|i128|i256)?/,
                "number.hex",
            ],
            [
                /\d[\d_]*(?:u8|u16|u32|u64|u128|u256|i8|i16|i32|i64|i128|i256)?/,
                "number",
            ],

            // Delimiter
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
            [
                /x"/,
                {
                    token: "string.quote",
                    bracket: "@open",
                    next: "@hexstring",
                },
            ],

            // Characters
            [/'[^\\']'/, "string"],
            [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
            [/'/, "string.invalid"],
        ],

        // ---- Attribute with nested parens ----
        attribute: [
            [/[^\]\(\)]+/, "annotation"],
            [/\(/, { token: "annotation", next: "@attributeArgs" }],
            [/\]/, { token: "annotation", next: "@pop" }],
        ],

        attributeArgs: [
            [/[^\(\)]+/, "annotation"],
            [/\(/, { token: "annotation", next: "@push" }],
            [/\)/, { token: "annotation", next: "@pop" }],
        ],

        // ---- After fun keyword – highlight function name ----
        functionDef: [
            [/[ \t]+/, "white"],
            [/[a-z_]\w*/, { token: "entity.name.function", next: "@pop" }],
            [/./, { token: "@rematch", next: "@pop" }],
        ],

        // ---- After struct / enum keyword – highlight type name ----
        typeDef: [
            [/[ \t]+/, "white"],
            [/[A-Za-z_]\w*/, { token: "entity.name.type", next: "@pop" }],
            [/./, { token: "@rematch", next: "@pop" }],
        ],

        // ---- After module keyword – highlight address::name ----
        moduleDef: [
            [/[ \t]+/, "white"],
            [/0[xX][0-9a-fA-F_]+/, "number.hex"],
            [/::/, "delimiter"],
            [/[a-zA-Z_]\w*(?=\s*::)/, "entity.name.type"],
            [/[a-zA-Z_]\w*/, { token: "entity.name.type", next: "@pop" }],
            [/./, { token: "@rematch", next: "@pop" }],
        ],

        // ---- After has keyword – highlight abilities ----
        abilityList: [
            [/[ \t]+/, "white"],
            [/,/, "delimiter"],
            [
                /[a-z_]\w*/,
                {
                    cases: {
                        "@abilities": "support.type",
                        "@default": { token: "@rematch", next: "@pop" },
                    },
                },
            ],
            [/./, { token: "@rematch", next: "@pop" }],
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

        hexstring: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape.invalid"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
        ],

        lambdaParams: [
            [/\r?\n/, { token: "white", next: "@pop" }],
            { include: "@whitespace" },
            [/\|/, { token: "operator", next: "@pop" }],
            [/&mut\b/, "keyword"],
            [/&/, "operator"],
            [
                /[a-z_$][\w$]*/,
                {
                    cases: {
                        "@typeKeywords": "type",
                        "@keywords": "keyword",
                        "@default": "variable.parameter",
                    },
                },
            ],
            [/[A-Z][\w$]*/, "type.identifier"],
            [/[(),]/, "delimiter"],
        ],

        whitespace: [
            [/[ \t\r\n]+/, "white"],
            [/\/\*/, "comment", "@comment"],
            [/\/\/\/.*$/, "comment.doc"],
            [/\/\/.*$/, "comment"],
        ],
    },
};
