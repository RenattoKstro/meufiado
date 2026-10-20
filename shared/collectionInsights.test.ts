import { describe, expect, it } from "vitest";
import { monthOverMonth } from "./collectionInsights";

describe("insights de recebimento", () => {
  it("calcula a evolução entre meses", () => {
    expect(monthOverMonth(12_000, 10_000)).toMatchObject({ direction: "up", difference: 2_000, percent: 20 });
    expect(monthOverMonth(8_000, 10_000)).toMatchObject({ direction: "down", difference: -2_000, percent: -20 });
  });
});
