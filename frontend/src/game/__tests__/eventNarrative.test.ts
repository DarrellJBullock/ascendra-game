import { afterEach, describe, expect, it, vi } from "vitest";
import { generateEventNarrative } from "../eventNarrative";
import type { EventRequestContext } from "../eventNarrative";

const baseContext: EventRequestContext = {
  companyName: "Test Co",
  industry: "AI",
  founderType: "Engineer",
  week: 5,
  technicalDebt: 40,
  cash: 50_000,
  mrr: 2_000,
  customerCount: 30,
  severityHint: "moderate",
};

const validAiResponse = {
  narrative: "Something happened.",
  choices: [
    {
      label: "Choice A",
      description: "Do A.",
      consequences: { cashDelta: -1000, technicalDebtDelta: -5, customerCountDelta: 0 },
    },
    {
      label: "Choice B",
      description: "Do B.",
      consequences: { cashDelta: 0, technicalDebtDelta: 5, customerCountDelta: -2 },
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("generateEventNarrative (FE-2/FE-4)", () => {
  it("returns the AI response when it is valid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validAiResponse,
      }),
    );

    const result = await generateEventNarrative({
      trigger: "engineering",
      context: baseContext,
    });

    expect(result.source).toBe("ai");
    expect(result.narrative).toBe(validAiResponse.narrative);
    expect(result.choices).toHaveLength(2);
  });

  it("falls back on non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    const result = await generateEventNarrative({
      trigger: "engineering",
      context: baseContext,
    });

    expect(result.source).toBe("fallback");
    expect(result.choices.length).toBeGreaterThanOrEqual(2);
    expect(result.choices.length).toBeLessThanOrEqual(3);
  });

  it("falls back on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const result = await generateEventNarrative({
      trigger: "engineering",
      context: baseContext,
    });

    expect(result.source).toBe("fallback");
  });

  it("falls back on malformed JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("bad json");
        },
      }),
    );

    const result = await generateEventNarrative({
      trigger: "engineering",
      context: baseContext,
    });

    expect(result.source).toBe("fallback");
  });

  it("falls back on schema-invalid response (wrong choice count)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          narrative: "x",
          choices: [validAiResponse.choices[0]],
        }),
      }),
    );

    const result = await generateEventNarrative({
      trigger: "engineering",
      context: baseContext,
    });

    expect(result.source).toBe("fallback");
  });

  it("falls back on schema-invalid response (non-numeric consequence)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          narrative: "x",
          choices: [
            {
              label: "A",
              description: "d",
              consequences: { cashDelta: "not-a-number" },
            },
            {
              label: "B",
              description: "d",
              consequences: { cashDelta: 0 },
            },
          ],
        }),
      }),
    );

    const result = await generateEventNarrative({
      trigger: "engineering",
      context: baseContext,
    });

    expect(result.source).toBe("fallback");
  });

  it("falls back on client-side timeout (>5s)", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        });
      }),
    );

    const resultPromise = generateEventNarrative({
      trigger: "engineering",
      context: baseContext,
    });

    await vi.advanceTimersByTimeAsync(5_001);
    const result = await resultPromise;

    expect(result.source).toBe("fallback");
  });

  it("never throws/crashes regardless of failure mode", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("weird non-Error rejection"));
    await expect(
      generateEventNarrative({ trigger: "engineering", context: baseContext }),
    ).resolves.toBeDefined();
  });
});
