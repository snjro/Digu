import { describe, expect, test, vi } from "vitest";
import { mount } from "svelte";
import type {
  ColDef,
  ColGroupDef,
  ICellRendererComp,
  ICellRendererParams,
} from "ag-grid-community";
import { columnDefsBasic } from "./columnDefsBasic";

vi.mock("svelte", async (importOriginal) => ({
  ...(await importOriginal<typeof import("svelte")>()),
  mount: vi.fn(),
}));

describe("columnDefsBasic", () => {
  test("should link the event name to the first tab of the event", () => {
    const columnDef = columnDefsBasic(
      "/digu/ethereum/Uniswap-v3/contracts/Token/events/",
    ) as ColGroupDef;
    const Renderer = (columnDef.children[0] as ColDef)
      .cellRenderer as new () => ICellRendererComp;
    new Renderer().init!({
      data: { eventName: "Transfer" },
    } as ICellRendererParams);
    expect(vi.mocked(mount).mock.calls[0][1].props).toMatchObject({
      href: "/digu/ethereum/Uniswap-v3/contracts/Token/events/Transfer#overview",
    });
  });
});
