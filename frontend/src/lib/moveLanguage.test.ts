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

    it("includes abilities array", () => {
        const abilities = new Set(moveLanguageConfig.abilities ?? []);
        expect(abilities.has("copy")).toBe(true);
        expect(abilities.has("drop")).toBe(true);
        expect(abilities.has("key")).toBe(true);
        expect(abilities.has("store")).toBe(true);
    });

    it("includes builtin functions array", () => {
        const builtins = new Set(moveLanguageConfig.builtinFunctions ?? []);
        expect(builtins.has("assert")).toBe(true);
        expect(builtins.has("borrow_global")).toBe(true);
        expect(builtins.has("borrow_global_mut")).toBe(true);
        expect(builtins.has("exists")).toBe(true);
        expect(builtins.has("move_from")).toBe(true);
        expect(builtins.has("move_to")).toBe(true);
        expect(builtins.has("freeze")).toBe(true);
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
        // The whitespace state should contain a rule that tokens as "comment.doc"
        const hasDocCommentRule = whitespace.some(
            (rule: unknown) => Array.isArray(rule) && rule[1] === "comment.doc",
        );
        expect(hasDocCommentRule).toBe(true);
    });
});
