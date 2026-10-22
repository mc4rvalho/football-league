import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConditionBadge } from "./ConditionBadge";

describe("ConditionBadge", () => {
  it.each([
    ["APTO", "Apto"],
    ["MAL_CONDICIONADO", "Mal condicionado"],
    ["DOENTE", "Doente"],
  ])("shows the label for %s", (condition, label) => {
    render(<ConditionBadge condition={condition} />);
    expect(screen.getByText(label)).toBeVisible();
  });
});
