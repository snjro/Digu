import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { get } from "svelte/store";
import { goto } from "$app/navigation";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
  storeNodbShowLoader,
} from "#stores/storeNoDb.js";
import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
import { customLogger } from "#utils/logger.js";
import { initialDataUserSettings } from "#db/dbTypes.js";
import { storeUserSettings } from "#stores/storeUserSettings.js";
import { selectAsUser } from "../../../testUtils/selectAsUser";
import SelectChain from "./SelectChain.svelte";
import { saveSelectedChainName } from "./selectChain";

const { selectProps } = vi.hoisted(() => ({
  selectProps: {} as { onchange?: (event: Event) => Promise<void> },
}));

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("#lib/common/basePath.js", () => ({ basePath: "" }));
vi.mock("./selectChain", () => ({ saveSelectedChainName: vi.fn() }));
// The real chain data loads ethers, which does not load in the client project.
vi.mock("#constants/chains/_index.js", () => ({
  TARGET_CHAINS: [
    { name: "eth", fullName: "Ethereum" },
    { name: "chain2", fullName: "Chain 2" },
  ],
}));
// Keeps the change handler, so that a test can wait for its promise.
vi.mock("#lib/base/BaseSelect.svelte", async (importOriginal) => {
  const { default: BaseSelect } = await importOriginal<{
    default: (anchor: unknown, props: unknown) => unknown;
  }>();
  return {
    default: (anchor: unknown, props: typeof selectProps) => {
      selectProps.onchange = props.onchange;
      return BaseSelect(anchor, props);
    },
  };
});

function selectChain(chainName: string): Promise<void> {
  render(SelectChain);
  return selectProps.onchange!({
    target: { value: chainName },
  } as unknown as Event);
}

describe("SelectChain.svelte", () => {
  afterEach(() => {
    vi.mocked(saveSelectedChainName).mockReset();
    vi.mocked(goto).mockReset();
    vi.restoreAllMocks();
    storeNodbShowLoader.set(false);
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
    storeUserSettings.set({ ...initialDataUserSettings });
    selectProps.onchange = undefined;
  });

  test("shows the loader while it saves the chain and moves to its root", async () => {
    const loaderValues: boolean[] = [];
    vi.mocked(saveSelectedChainName).mockImplementation(async () => {
      loaderValues.push(get(storeNodbShowLoader));
    });
    await selectChain("chain2");
    expect(saveSelectedChainName).toHaveBeenCalledExactlyOnceWith("chain2");
    expect(goto).toHaveBeenCalledExactlyOnceWith("/chain2");
    expect(loaderValues).toEqual([true]);
    expect(get(storeNodbShowLoader)).toBe(false);
  });

  test("shows a snackbar and hides the loader when saving the chain fails", async () => {
    const error = new Error("DB error");
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(saveSelectedChainName).mockRejectedValue(error);
    await expect(selectChain("chain2")).resolves.toBeUndefined();
    expect(customLogger.error).toHaveBeenCalledWith(
      "Save the selected chain.",
      error,
    );
    expect(get(storeNoDbSnackBar)).toEqual(showSnackBarAsSaveFailed);
    expect(goto).not.toHaveBeenCalled();
    expect(get(storeNodbShowLoader)).toBe(false);
  });

  test("shows the saved chain again when saving the picked one fails", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(saveSelectedChainName).mockRejectedValueOnce(
      new Error("DB error"),
    );
    storeUserSettings.updateState({ selectedChainName: "chain2" });
    render(SelectChain);
    const select = screen.getByRole("combobox", {
      name: "Chain",
    }) as HTMLSelectElement;
    expect(select.value).toBe("chain2");

    await selectAsUser(select, "eth");
    await vi.waitFor(() =>
      expect(get(storeNoDbSnackBar)).toEqual(showSnackBarAsSaveFailed),
    );
    expect(saveSelectedChainName).toHaveBeenCalledExactlyOnceWith("eth");
    expect(select.value).toBe("chain2");
  });
});
