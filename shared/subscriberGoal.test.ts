import { describe, expect, it } from "vitest";
import { subscriberGoalLabel, subscriberGoalStatus } from "./subscriberGoal";

describe("subscriber goal", () => {
  it("marks an unconfigured goal", () => {
    expect(subscriberGoalStatus(0, 12)).toBe("undefined");
    expect(subscriberGoalLabel(0, 12)).toBe("Não definida");
  });

  it("shows an alert state below the minimum", () => {
    expect(subscriberGoalStatus(100, 92)).toBe("below");
    expect(subscriberGoalLabel(100, 92)).toBe("92 de 100");
  });

  it("shows the achieved state at or above the minimum", () => {
    expect(subscriberGoalStatus(100, 100)).toBe("achieved");
    expect(subscriberGoalStatus(100, 108)).toBe("achieved");
  });
});
