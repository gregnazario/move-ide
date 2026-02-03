import { describe, expect, it } from "vitest";
import { moveLanguageConfig, moveLambdaStartRegex } from "./moveLanguage";

describe("moveLanguageConfig", () => {
    it("includes Move 2.x keywords and types", () => {
        const keywords = new Set(moveLanguageConfig.keywords ?? []);
        const types = new Set(moveLanguageConfig.typeKeywords ?? []);

        expect(keywords.has("enum")).toBe(true);
        expect(keywords.has("match")).toBe(true);
        expect(keywords.has("for")).toBe(true);
        expect(keywords.has("in")).toBe(true);
        expect(keywords.has("package")).toBe(true);
        expect(types.has("i64")).toBe(true);
    });

    it("detects lambda parameter starts without matching logical or", () => {
        expect(moveLambdaStartRegex.test("|x|")).toBe(true);
        expect(moveLambdaStartRegex.test("| x: u64 |")).toBe(true);
        expect(moveLambdaStartRegex.test("|&mut x|")).toBe(true);
        expect(moveLambdaStartRegex.test("||")).toBe(false);
        expect(moveLambdaStartRegex.test("|=")).toBe(false);
        expect(moveLambdaStartRegex.test("| 123 |")).toBe(false);
    });
});
