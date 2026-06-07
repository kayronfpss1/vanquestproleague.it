import { describe, expect, it } from "vitest";
import { calculateEloChange, ELO_START, ELO_K } from "./db";

describe("Elo system constants", () => {
  it("should have starting Elo of 1500", () => {
    expect(ELO_START).toBe(1500);
  });

  it("should have K factor of 32", () => {
    expect(ELO_K).toBe(32);
  });
});

describe("calculateEloChange", () => {
  it("should return exactly 16 when both teams have equal Elo", () => {
    const change = calculateEloChange(1500, 1500);
    expect(change).toBe(16);
  });

  it("should return less than 16 when winner has higher Elo (expected win)", () => {
    const change = calculateEloChange(1700, 1300);
    expect(change).toBeLessThan(16);
    expect(change).toBeGreaterThan(0);
  });

  it("should return more than 16 when winner has lower Elo (upset win)", () => {
    const change = calculateEloChange(1300, 1700);
    expect(change).toBeGreaterThan(16);
    expect(change).toBeLessThanOrEqual(32);
  });

  it("should always return a non-negative integer", () => {
    const cases = [
      [1500, 1500],
      [2000, 1000],
      [1000, 2000],
      [1600, 1400],
    ] as [number, number][];
    for (const [w, l] of cases) {
      const change = calculateEloChange(w, l);
      expect(change).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(change)).toBe(true);
    }
  });

  it("should use the standard Elo formula: K * (1 - expected)", () => {
    const winnerElo = 1600;
    const loserElo = 1400;
    const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedChange = Math.round(32 * (1 - expected));
    expect(calculateEloChange(winnerElo, loserElo)).toBe(expectedChange);
  });

  it("should give max ~32 points for extreme upset (very weak beats very strong)", () => {
    const change = calculateEloChange(1000, 3000);
    expect(change).toBeLessThanOrEqual(32);
    expect(change).toBeGreaterThanOrEqual(30);
  });

  it("should give very few points for dominant team beating very weak team", () => {
    const change = calculateEloChange(3000, 1000);
    // With extreme Elo difference, the change rounds to 0 or 1 — both are valid
    expect(change).toBeGreaterThanOrEqual(0);
    expect(change).toBeLessThanOrEqual(3);
  });
});

describe("auth.logout", () => {
  it("should be importable from routers", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
  });
});
