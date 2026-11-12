import { describe, it, expect } from "vitest";
import {
  assessRefundEligibility,
  buildRefundRequestedEmail,
  type RefundEligibilityFacts,
} from "./refund-eligibility";

// Local-time constructors: the window is counted in local calendar days.
const purchasedAt = new Date(2026, 0, 1, 23, 0).toISOString();

function facts(
  overrides: Partial<RefundEligibilityFacts> = {}
): RefundEligibilityFacts {
  return {
    purchasedAt,
    now: new Date(2026, 0, 5, 12, 0),
    hasRequestedRefund: false,
    hasClaimedTeamSeat: false,
    secondsWatched: 0,
    completedLessons: 0,
    totalLessons: 10,
    ...overrides,
  };
}

describe("assessRefundEligibility", () => {
  it("is eligible inside the window with little progress", () => {
    expect(assessRefundEligibility(facts())).toEqual({
      eligible: true,
      lastDayInWindow: "2026-01-15",
    });
  });

  describe("refund window", () => {
    it("is eligible on the last day, even late in the evening", () => {
      const result = assessRefundEligibility(
        facts({ now: new Date(2026, 0, 15, 23, 59) })
      );
      expect(result.eligible).toBe(true);
    });

    it("is ineligible the day after the last day", () => {
      expect(
        assessRefundEligibility(facts({ now: new Date(2026, 0, 16, 0, 1) }))
      ).toEqual({ eligible: false, reason: "window-closed" });
    });

    it("is ineligible before the purchase day", () => {
      expect(
        assessRefundEligibility(facts({ now: new Date(2025, 11, 31, 12, 0) }))
      ).toEqual({ eligible: false, reason: "window-closed" });
    });
  });

  describe("watch limit", () => {
    it("is eligible just under two hours watched", () => {
      expect(
        assessRefundEligibility(facts({ secondsWatched: 2 * 60 * 60 - 1 }))
          .eligible
      ).toBe(true);
    });

    it("is ineligible at exactly two hours watched", () => {
      expect(
        assessRefundEligibility(facts({ secondsWatched: 2 * 60 * 60 }))
      ).toEqual({ eligible: false, reason: "too-much-watched" });
    });
  });

  describe("completion limit", () => {
    it("is eligible just under half completed", () => {
      expect(
        assessRefundEligibility(facts({ completedLessons: 4 })).eligible
      ).toBe(true);
    });

    it("is ineligible at exactly half completed", () => {
      expect(
        assessRefundEligibility(facts({ completedLessons: 5 }))
      ).toEqual({ eligible: false, reason: "too-much-completed" });
    });

    it("ignores completion for a course with no lessons", () => {
      expect(
        assessRefundEligibility(facts({ totalLessons: 0, completedLessons: 0 }))
          .eligible
      ).toBe(true);
    });
  });

  it("is ineligible when a claimed team seat", () => {
    expect(
      assessRefundEligibility(facts({ hasClaimedTeamSeat: true }))
    ).toEqual({ eligible: false, reason: "claimed-team-seat" });
  });

  it("is ineligible when a refund is already requested", () => {
    expect(
      assessRefundEligibility(facts({ hasRequestedRefund: true }))
    ).toEqual({ eligible: false, reason: "already-requested" });
  });
});

describe("buildRefundRequestedEmail", () => {
  const email = buildRefundRequestedEmail({
    learnerName: "Liam",
    learnerEmail: "liam@example.com",
    courseTitle: "Introduction to TypeScript",
    amount: 7900,
  });

  it("addresses the learner and names the course in the subject", () => {
    expect(email.to).toBe("liam@example.com");
    expect(email.subject).toBe(
      "Refund requested — Introduction to TypeScript"
    );
  });

  it("uses only the canonical refund wording", () => {
    const text = `${email.subject}\n${email.body}`;
    expect(text).toMatch(/refund request/i);
    expect(text).not.toMatch(/reversal|chargeback|cancel/i);
  });
});
