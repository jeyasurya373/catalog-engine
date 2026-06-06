import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Empty, Loading } from "./State";

describe("state components", () => {
  it("renders loading copy", () => {
    render(<Loading />);
    expect(screen.getByText("Loading data...")).toBeTruthy();
  });

  it("renders empty copy", () => {
    render(<Empty label="No products" />);
    expect(screen.getByText("No products")).toBeTruthy();
  });
});
