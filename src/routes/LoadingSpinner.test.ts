import { describe, expect, test } from "vitest";
import { render } from "@testing-library/svelte";
import LoadingSpinner from "./LoadingSpinner.svelte";
import { storeNodbShowLoader } from "@stores/storeNoDb";

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
    state: "show",
  },
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
    `$state loader. paramShow=$paramShow, storeShow=$storeShow`,
    ({ storeShow }: ShowParam) => {
      //set store value
      storeNodbShowLoader.set(storeShow);

      // get element
      const actualHtmlElement: HTMLElement | null = render(
        LoadingSpinner,
        {},
      ).queryByTestId("loadingSpinner-test");

      if (storeShow) {
        expect(actualHtmlElement).not.toBeNull();
      } else {
        expect(actualHtmlElement).toBeNull();
      }
    },
  );
});
