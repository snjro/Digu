import { describe, expect, test } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import type { AbiFragmentParam } from "#constants/chains/types.js";
import { NO_DATA } from "#utils/utilsConstants.js";
import AbiParamsTable from "./AbiParamsTable.svelte";

// ethers does not load in the client project, so the params are objects with
// the fields that the table reads. format("json") gives the standard ABI JSON.
function param(
  fields: Partial<AbiFragmentParam> & { json?: object },
): AbiFragmentParam {
  return {
    name: "",
    type: "uint256",
    indexed: null,
    components: null,
    arrayChildren: null,
    format: () => JSON.stringify(fields.json),
    ...fields,
  } as unknown as AbiFragmentParam;
}

function cellsOfRow(index: number): string[] {
  const row: HTMLElement = screen.getAllByRole("row")[index + 1];
  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent?.trim() ?? "");
}

describe("AbiParamsTable.svelte", () => {
  test("shows the name, type and indexed of each param", () => {
    render(AbiParamsTable, {
      paramTypes: [
        param({ name: "from", type: "address", indexed: true }),
        param({ name: "", type: "uint256", indexed: false }),
        param({ name: "c", type: "bool", indexed: null }),
      ],
      dialogHeaderText: "Inputs",
      showInputIndexedField: true,
    });
    expect(cellsOfRow(0)).toEqual(["1", "from", "address", "true", NO_DATA]);
    // Like the columns of the grid (getAbiParamText).
    expect(cellsOfRow(1)).toEqual(["2", NO_DATA, "uint256", "false", NO_DATA]);
    expect(cellsOfRow(2)).toEqual(["3", "c", "bool", NO_DATA, NO_DATA]);
  });

  test("leaves the indexed column out for a function", () => {
    render(AbiParamsTable, {
      paramTypes: [param({ name: "owner", type: "address" })],
      dialogHeaderText: "Inputs",
      showInputIndexedField: false,
    });
    expect(cellsOfRow(0)).toEqual(["1", "owner", "address", NO_DATA]);
  });

  test("shows the standard JSON of the components of a tuple", async () => {
    const components: AbiFragmentParam[] = [
      param({
        name: "a",
        type: "uint256",
        json: { type: "uint256", name: "a" },
      }),
    ];
    render(AbiParamsTable, {
      paramTypes: [
        param({ name: "s", type: "tuple(uint256)", components: components }),
      ],
      dialogHeaderText: "Inputs",
      showInputIndexedField: false,
    });
    await fireEvent.click(screen.getByRole("button", { name: "View" }));
    const dialog: HTMLElement = screen.getByRole("dialog");
    expect(dialog.textContent).toContain('"name": "a"');
    // Not the fields that only ethers has.
    expect(dialog.textContent).not.toContain("arrayChildren");
  });
});
