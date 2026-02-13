import { describe, expect, it } from "vitest";
import { moveLambdaStartRegex, moveLanguageConfig } from "./moveLanguage";

describe("moveLanguageConfig", () => {
    it("includes Move 2.x keywords and types", () => {
        const keywords = new Set(moveLanguageConfig.keywords ?? []);
        const types = new Set(moveLanguageConfig.typeKeywords ?? []);

        expect(keywords.has("enum")).toBe(true);
        expect(keywords.has("match")).toBe(true);
        expect(keywords.has("for")).toBe(true);
        expect(keywords.has("in")).toBe(true);
        expect(keywords.has("package")).toBe(true);
        expect(keywords.has("macro")).toBe(true);
        expect(keywords.has("receiver")).toBe(true);
        expect(types.has("i64")).toBe(true);
    });

    it("includes spec language keywords", () => {
        const keywords = new Set(moveLanguageConfig.keywords ?? []);

        expect(keywords.has("spec")).toBe(true);
        expect(keywords.has("schema")).toBe(true);
        expect(keywords.has("invariant")).toBe(true);
        expect(keywords.has("pragma")).toBe(true);
        expect(keywords.has("ensures")).toBe(true);
        expect(keywords.has("requires")).toBe(true);
        expect(keywords.has("aborts_if")).toBe(true);
        expect(keywords.has("aborts_with")).toBe(true);
        expect(keywords.has("modifies")).toBe(true);
        expect(keywords.has("emits")).toBe(true);
        expect(keywords.has("forall")).toBe(true);
        expect(keywords.has("exists")).toBe(true);
        expect(keywords.has("choose")).toBe(true);
        expect(keywords.has("global")).toBe(true);
        expect(keywords.has("old")).toBe(true);
        expect(keywords.has("include")).toBe(true);
        expect(keywords.has("assume")).toBe(true);
        expect(keywords.has("apply")).toBe(true);
        expect(keywords.has("axiom")).toBe(true);
        expect(keywords.has("with")).toBe(true);
    });

    it("includes abilities array", () => {
        const abilities = new Set(moveLanguageConfig.abilities ?? []);
        expect(abilities.has("copy")).toBe(true);
        expect(abilities.has("drop")).toBe(true);
        expect(abilities.has("key")).toBe(true);
        expect(abilities.has("store")).toBe(true);
    });

    it("includes global storage builtins in builtinFunctions", () => {
        const builtins = new Set(moveLanguageConfig.builtinFunctions ?? []);
        expect(builtins.has("borrow_global")).toBe(true);
        expect(builtins.has("borrow_global_mut")).toBe(true);
        expect(builtins.has("move_from")).toBe(true);
        expect(builtins.has("move_to")).toBe(true);
        expect(builtins.has("freeze")).toBe(true);
        // assert is a keyword, assert! is handled by the macro rule
        expect(builtins.has("assert")).toBe(false);
    });

    it("detects lambda parameter starts without matching logical or", () => {
        expect(moveLambdaStartRegex.test("|x|")).toBe(true);
        expect(moveLambdaStartRegex.test("| x: u64 |")).toBe(true);
        expect(moveLambdaStartRegex.test("|&mut x|")).toBe(true);
        expect(moveLambdaStartRegex.test("||")).toBe(false);
        expect(moveLambdaStartRegex.test("|=")).toBe(false);
        expect(moveLambdaStartRegex.test("| 123 |")).toBe(false);
    });

    it("has tokenizer states for function, type, module, and ability highlighting", () => {
        const states = moveLanguageConfig.tokenizer as Record<string, unknown>;
        expect(states.functionDef).toBeDefined();
        expect(states.typeDef).toBeDefined();
        expect(states.moduleDef).toBeDefined();
        expect(states.abilityList).toBeDefined();
    });

    it("has tokenizer states for attribute parsing with nested parens", () => {
        const states = moveLanguageConfig.tokenizer as Record<string, unknown>;
        expect(states.attribute).toBeDefined();
        expect(states.attributeArgs).toBeDefined();
    });

    it("has constDef state for constant name highlighting", () => {
        const states = moveLanguageConfig.tokenizer as Record<string, unknown>;
        expect(states.constDef).toBeDefined();
    });

    it("has docComment state for @tag highlighting in doc comments", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        expect(states.docComment).toBeDefined();

        // docComment should contain a rule that produces comment.doc.tag
        const dc = states.docComment;
        const hasDocTagRule = dc.some((rule: unknown) => {
            if (!Array.isArray(rule) || rule.length < 2) return false;
            const action = rule[1];
            if (typeof action === "string") return action === "comment.doc.tag";
            if (typeof action === "object" && action !== null) {
                return (
                    (action as Record<string, unknown>).token ===
                    "comment.doc.tag"
                );
            }
            return false;
        });
        expect(hasDocTagRule).toBe(true);
    });

    it("has doc comment rules in whitespace state that enter docComment", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        const whitespace = states.whitespace;
        // Should have a rule that enters @docComment state
        const hasDocCommentState = whitespace.some((rule: unknown) => {
            if (!Array.isArray(rule) || rule.length < 2) return false;
            const action = rule[1];
            if (typeof action === "object" && action !== null) {
                return (
                    (action as Record<string, unknown>).next === "@docComment"
                );
            }
            return false;
        });
        expect(hasDocCommentState).toBe(true);
        // Should also have a fallback for empty /// lines
        const hasEmptyDocRule = whitespace.some(
            (rule: unknown) => Array.isArray(rule) && rule[1] === "comment.doc",
        );
        expect(hasEmptyDocRule).toBe(true);
    });

    it("has qualifiedPath state for module-qualified paths", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        expect(states.qualifiedPath).toBeDefined();

        // qualifiedPath should contain a rule that produces entity.name.function.invoke
        // for terminal segments followed by (
        const qp = states.qualifiedPath;
        const hasFnInvokeTerminal = qp.some((rule: unknown) => {
            if (!Array.isArray(rule) || rule.length < 2) return false;
            const action = rule[1];
            if (typeof action !== "object" || action === null) return false;
            return (
                (action as Record<string, unknown>).token ===
                "entity.name.function.invoke"
            );
        });
        expect(hasFnInvokeTerminal).toBe(true);

        // qualifiedPath should also contain a type.identifier terminal rule
        const hasTypeTerminal = qp.some((rule: unknown) => {
            if (!Array.isArray(rule) || rule.length < 2) return false;
            const action = rule[1];
            if (typeof action !== "object" || action === null) return false;
            return (
                (action as Record<string, unknown>).token === "type.identifier"
            );
        });
        expect(hasTypeTerminal).toBe(true);
    });

    it("has path-start rules in root that enter qualifiedPath state", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        const root = states.root;

        // Should have a rule for hex address path start (0x1::)
        const hasHexPathStart = root.some((rule: unknown) => {
            if (!Array.isArray(rule) || rule.length < 2) return false;
            const action = rule[1];
            if (typeof action !== "object" || action === null) return false;
            const a = action as Record<string, unknown>;
            return a.token === "number.hex" && a.next === "@qualifiedPath";
        });
        expect(hasHexPathStart).toBe(true);

        // Should have a rule for named path start (std::)
        const hasNamedPathStart = root.some((rule: unknown) => {
            if (!Array.isArray(rule) || rule.length < 2) return false;
            const action = rule[1];
            if (typeof action !== "object" || action === null) return false;
            const a = action as Record<string, unknown>;
            return a.token === "type.identifier" && a.next === "@qualifiedPath";
        });
        expect(hasNamedPathStart).toBe(true);
    });

    it("hex path-start regex accepts both 0x and 0X prefixes", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        const root = states.root;

        // Find the hex path-start rule
        const hexPathRule = root.find((rule: unknown) => {
            if (!Array.isArray(rule) || rule.length < 2) return false;
            const action = rule[1];
            if (typeof action !== "object" || action === null) return false;
            const a = action as Record<string, unknown>;
            return a.token === "number.hex" && a.next === "@qualifiedPath";
        });
        expect(hexPathRule).toBeDefined();
        const regex = (hexPathRule as unknown[])[0] as RegExp;
        // The regex includes a (?=\s*::) lookahead, so test strings must
        // include :: to satisfy it.
        expect(regex.test("0x1::")).toBe(true);
        // 0X should also match (case-insensitive prefix)
        expect(regex.test("0X1::")).toBe(true);
    });

    it("has vector constructor rule in root that highlights vector as support.function", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        const root = states.root;
        const hasVectorCtorRule = root.some((rule: unknown) => {
            if (!Array.isArray(rule) || rule.length < 2) return false;
            // Look for a rule that matches vector as support.function
            const action = rule[1];
            if (action !== "support.function") return false;
            const regex = rule[0] as RegExp;
            // Should match vector followed by [
            return regex.test("vector[") && regex.test("vector <u64>[");
        });
        expect(hasVectorCtorRule).toBe(true);
    });

    it("has function invocation rule in root with nested-generic-aware lookahead", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        const root = states.root;
        const hasFnInvokeRule = root.some((rule: unknown) => {
            if (!Array.isArray(rule) || rule.length < 2) return false;
            const action = rule[1];
            if (typeof action !== "object" || action === null) return false;
            const cases = (action as Record<string, unknown>).cases;
            if (typeof cases !== "object" || cases === null) return false;
            return (
                (cases as Record<string, unknown>)["@default"] ===
                "entity.name.function.invoke"
            );
        });
        expect(hasFnInvokeRule).toBe(true);
    });

    it("abilityList state accepts both comma and plus separators", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        const abilityList = states.abilityList;
        const hasPlusSeparator = abilityList.some(
            (rule: unknown) =>
                Array.isArray(rule) &&
                rule[0] instanceof RegExp &&
                rule[0].test("+") &&
                rule[0].test(","),
        );
        expect(hasPlusSeparator).toBe(true);
    });
});
