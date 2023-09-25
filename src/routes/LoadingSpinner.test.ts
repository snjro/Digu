import { describe, expect, test } from "vitest";
import { render } from "@testing-library/svelte";
import LoadingSpinner from "./LoadingSpinner.svelte";
import { storeNodbShowLoader } from "@stores/storeNoDb";

type ShowParam = {
  paramShow: boolean;
  storeShow: boolean;
  state: "show" | "hide";
};
const showParams: ShowParam[] = [
  {
    paramShow: true,
    storeShow: true,
    state: "show",
  },
  {
    paramShow: true,
    storeShow: false,
    state: "show",
  },
  {
    paramShow: false,
    storeShow: true,
    state: "show",
  },
  {
    paramShow: false,
    storeShow: false,
    state: "hide",
  },
];
describe("LoadingSpinner.svelte", () => {
  test.each<ShowParam>(showParams)(
    `$state loader. paramShow=$paramShow, storeShow=$storeShow`,
    ({ paramShow, storeShow }: ShowParam) => {
      //set store value
      storeNodbShowLoader.set(storeShow);

      // get element
      const actualHtmlElement: HTMLElement | null = render(LoadingSpinner, {
        showLoader: paramShow,
      }).queryByTestId("loadingSpinner-test");

      if (paramShow || storeShow) {
        expect(actualHtmlElement).not.toBeNull();
      } else {
        expect(actualHtmlElement).toBeNull();
      }
    },
  );
});
