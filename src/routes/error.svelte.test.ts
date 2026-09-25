import { describe, expect, test, vi } from "vitest";
import { flushSync } from "svelte";
import { render, screen } from "@testing-library/svelte";
import { page } from "$app/state";
import ErrorPage from "./+error.svelte";

// $state, so that a change of the page reaches the component, as in the app.
vi.mock("$app/state", () => {
  const page = $state({
    status: 404,
    error: { message: "chain not found: foo" },
  });
  return { page };
});
// Served under /Digu/ on a host other than GitHub Pages.
vi.mock("$app/paths", () => ({ base: "/Digu" }));

describe("+error.svelte", () => {
  test("links HOME to the root of the app", () => {
    render(ErrorPage);
    expect(
      screen.getByRole("link", { name: "HOME" }).getAttribute("href"),
    ).toBe("/Digu/");
  });

  test("follows a change of the status and the message", () => {
    render(ErrorPage);
    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByText("chain not found: foo")).toBeTruthy();

    page.status = 500;
    page.error = { message: "Digu needs the browser storage" };
    flushSync();
    expect(screen.getByText("500")).toBeTruthy();
    expect(screen.getByText("Digu needs the browser storage")).toBeTruthy();
    expect(screen.queryByText("404")).toBeNull();
  });
});
