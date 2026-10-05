import { describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { beforeNavigate, type BeforeNavigate } from "$app/navigation";
import LoadingSpinner from "./LoadingSpinner.svelte";
import { storeNodbShowLoader } from "#stores/storeNoDb.js";

vi.mock("$app/navigation", () => ({
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}));

type ShowParam = {
  storeShow: boolean;
  state: "show" | "hide";
};
const showParams: ShowParam[] = [
  {
    storeShow: true,
    state: "show",
  },
  {
    storeShow: false,
    state: "hide",
  },
];
describe("LoadingSpinner.svelte", () => {
  test.each<ShowParam>(showParams)(
    `$state loader. storeShow=$storeShow`,
    ({ storeShow, state }: ShowParam) => {
      //set store value
      storeNodbShowLoader.set(storeShow);

      // get element
      const actualHtmlElement: HTMLElement | null = render(
        LoadingSpinner,
        {},
      ).queryByTestId("loadingSpinner-test");

      if (state === "show") {
        expect(actualHtmlElement).not.toBeNull();
      } else {
        expect(actualHtmlElement).toBeNull();
      }
    },
  );

  type NavigationParam = {
    navigation: Pick<BeforeNavigate, "willUnload" | "type">;
    state: "show" | "hide";
  };
  const navigationParams: NavigationParam[] = [
    {
      navigation: { willUnload: true, type: "leave" },
      state: "hide",
    },
    {
      navigation: { willUnload: false, type: "link" },
      state: "show",
    },
  ];
  test.each<NavigationParam>(navigationParams)(
    `$state loader before a navigation. type=$navigation.type, willUnload=$navigation.willUnload`,
    ({ navigation, state }: NavigationParam) => {
      storeNodbShowLoader.set(false);
      vi.mocked(beforeNavigate).mockClear();
      const { queryByTestId } = render(LoadingSpinner, {});
      const callback: (navigation: BeforeNavigate) => void =
        vi.mocked(beforeNavigate).mock.calls[0][0];

      callback(navigation as BeforeNavigate);
      flushSync();

      const actualHtmlElement: HTMLElement | null = queryByTestId(
        "loadingSpinner-test",
      );
      if (state === "show") {
        expect(actualHtmlElement).not.toBeNull();
      } else {
        expect(actualHtmlElement).toBeNull();
      }
    },
  );
});
