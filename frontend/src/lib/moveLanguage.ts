import type { languages } from "monaco-editor";

export const moveLambdaStartRegex = /\|(?!\|)(?=[ \t]*(?:&mut\b|&)?[A-Za-z_])/;

export const moveLanguageConfig: languages.IMonarchLanguage = {
    defaultToken: "",
    tokenPostfix: ".move",

    keywords: [
        // Declarations
        "module",
        "script",
        "struct",
        "enum",
        "fun",
        "const",
        "use",
        "spec",
        "schema",
        // Visibility & modifiers
        "public",
        "entry",
        "native",
        "inline",
        "friend",
        "package",
        // Control flow
        "if",
        "else",
        "while",
        "loop",
        "for",
        "in",
        "match",
        "break",
        "continue",
        "return",
        "abort",
        // Variable & ownership
        "let",
        "mut",
        "move",
        "copy",
        // Abilities clause
        "has",
        // Resource annotation
        "acquires",
        // Import aliasing
        "as",
        // Phantom type parameter
        "phantom",
        // Enum variant test (Move 2.0+)
        "is",
        // Move 2.x additions
        "macro",
        "receiver",
        // Spec language keywords
        "pragma",
        "invariant",
        "ensures",
        "requires",
        "aborts_if",
        "aborts_with",
        "include",
        "assume",
        "assert",
        "modifies",
        "emits",
        "apply",
        "axiom",
        "forall",
        "exists",
        "choose",
        "old",
        "global",
        "with",
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

    // Global storage operators (highlighted as builtins when called)
    builtinFunctions: [
        "borrow_global",
        "borrow_global_mut",
        "move_from",
        "move_to",
        "freeze",
    ],

    typeKeywords: [
        // Unsigned integers
        "u8",
        "u16",
        "u32",
        "u64",
        "u128",
        "u256",
        // Signed integers (Move 2.3+)
        "i8",
        "i16",
        "i32",
        "i64",
        "i128",
        "i256",
        // Other primitives
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
            // Attributes/annotations – handle nested parens
            // e.g. #[test], #[expected_failure(abort_code = 1)]
            [/#\[/, { token: "annotation", next: "@attribute" }],

            // Loop labels  e.g. 'outer
            [/'[a-zA-Z_][\w$]*/, "tag"],

            // Lambda parameters (|x, y| ...)
            [
                moveLambdaStartRegex,
                { token: "operator", next: "@lambdaParams" },
            ],

            // Builtin constants (ALL_CAPS)
            [/\b__COMPILE_FOR_TESTING__\b/, "constant"],
            [/\bMAX_[UI]\d+\b/, "constant"],
            [/\bMIN_I\d+\b/, "constant"],

            // Address literals  @0x1, @aptos_framework
            [/@0[xX][0-9a-fA-F_]+/, "number.hex"],
            [/@[a-zA-Z_][\w_]*/, "constant"],

            // Macro invocations: assert!(...), abort!(...)
            [/[a-z_$][\w$]*!/, "support.function"],

            // ---- Qualified paths (state-based) ----
            // Hex-address start:  0x1::module::Item
            [
                /0[xX][0-9a-fA-F_]+(?=\s*::)/,
                { token: "number.hex", next: "@qualifiedPath" },
            ],
            // Named start:  std::vector,  Self::func,  aptos_framework::coin
            [
                /[a-zA-Z_]\w*(?=\s*::)/,
                { token: "type.identifier", next: "@qualifiedPath" },
            ],

            // Function / method invocations: name(  or  name<T>(
            // Supports one level of nested generics: name<Outer<Inner>>(
            [
                /[a-z_$][\w$]*(?=\s*(?:<(?:[^<>]|<[^>]*>)*>)?\s*\()/,
                {
                    cases: {
                        self: "variable.predefined",
                        "@builtinFunctions": "support.function",
                        "@typeKeywords": "type",
                        "@literals": "constant",
                        "@keywords": "keyword",
                        "@default": "entity.name.function.invoke",
                    },
                },
            ],

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

        // ---- Qualified path segments after the initial identifier ----
        // Entered when we see `name::` — processes each :: segment and
        // classifies the *terminal* segment as a function invocation when
        // it is followed by optional generics + `(`.
        qualifiedPath: [
            [/\s+/, "white"],
            [/::/, "delimiter"],
            // Intermediate segment (more :: ahead)
            [/[a-zA-Z_]\w*(?=\s*::)/, "type.identifier"],
            // Terminal segment that is a function / method call
            [
                /[a-zA-Z_]\w*(?=\s*(?:<(?:[^<>]|<[^>]*>)*>)?\s*\()/,
                { token: "entity.name.function.invoke", next: "@pop" },
            ],
            // Terminal segment — plain type / module reference
            [/[a-zA-Z_]\w*/, { token: "type.identifier", next: "@pop" }],
            // Anything else (e.g. `{` in `use a::b::{…}`) — re-process in root
            [/./, { token: "@rematch", next: "@pop" }],
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
        // Handles both comma-separated (struct has copy, drop)
        // and plus-separated (|u64| u64 has drop + copy) forms.
        abilityList: [
            [/[ \t]+/, "white"],
            [/[,+]/, "delimiter"],
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
