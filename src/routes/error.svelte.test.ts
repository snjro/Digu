import { beforeEach, describe, expect, test, vi } from "vitest";
import { flushSync } from "svelte";
import { render, screen } from "@testing-library/svelte";
import { page } from "$app/state";
import ErrorPage from "./+error.svelte";

// page of $app/state is not a store. A SvelteMap makes status and error
// reactive, so that a change of the page reaches the component, as in the app.
vi.mock("$app/state", async () => {
  const { SvelteMap } = await import("svelte/reactivity");
  const values = new SvelteMap<string, unknown>();
  return {
    page: {
      get status() {
        return values.get("status");
      },
      set status(status: unknown) {
        values.set("status", status);
      },
      get error() {
        return values.get("error");
      },
      set error(error: unknown) {
        values.set("error", error);
      },
    },
  };
});
// The base path when the app is served under /Digu/.
vi.mock("$app/paths", () => ({ base: "/Digu" }));

describe("+error.svelte", () => {
  beforeEach(() => {
    page.status = 404;
    page.error = { message: "chain not found: foo" };
  });

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
