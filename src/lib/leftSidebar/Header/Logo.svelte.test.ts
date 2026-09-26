import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import Logo from "./Logo.svelte";

// The base path when the app is served under /Digu/.
vi.mock("$app/paths", () => ({ base: "/Digu" }));

describe("Logo.svelte", () => {
  test("links to the root of the app", () => {
    render(Logo);
    expect(
      screen.getByRole("link", { name: "Digu" }).getAttribute("href"),
    ).toBe("/Digu/");
  });
});
