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

        // spec declaration & block keywords
        expect(keywords.has("spec")).toBe(true);
        expect(keywords.has("schema")).toBe(true);
        expect(keywords.has("invariant")).toBe(true);

        // spec condition keywords
        expect(keywords.has("pragma")).toBe(true);
        expect(keywords.has("ensures")).toBe(true);
        expect(keywords.has("requires")).toBe(true);
        expect(keywords.has("aborts_if")).toBe(true);
        expect(keywords.has("aborts_with")).toBe(true);
        expect(keywords.has("modifies")).toBe(true);
        expect(keywords.has("emits")).toBe(true);

        // spec quantifiers & helpers
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

    it("has doc comment rule in whitespace state", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        const whitespace = states.whitespace;
        const hasDocCommentRule = whitespace.some(
            (rule: unknown) => Array.isArray(rule) && rule[1] === "comment.doc",
        );
        expect(hasDocCommentRule).toBe(true);
    });

    it("has module-qualified path rule in root", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        const root = states.root;
        // Should have a rule whose regex matches addr::name patterns
        const hasPathRule = root.some(
            (rule: unknown) =>
                Array.isArray(rule) &&
                rule[0] instanceof RegExp &&
                rule[0].test("std::vector") &&
                rule[0].test("0x1::coin::Coin"),
        );
        expect(hasPathRule).toBe(true);
    });

    it("has function invocation rule in root", () => {
        const states = moveLanguageConfig.tokenizer as Record<
            string,
            unknown[]
        >;
        const root = states.root;
        // Should have a rule with cases including entity.name.function.invoke
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
        // Should have a delimiter rule that matches both , and +
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
