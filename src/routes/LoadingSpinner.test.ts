import { describe, expect, test } from "vitest";
import { render } from "@testing-library/svelte";
import LoadingSpinner from "./LoadingSpinner.svelte";
import { storeNodbShowLoader } from "@stores/storeNoDb";

type ShowParam = {
  paramShow: boolean;
  storeShow: boolean;
};
const showParams: ShowParam[] = [
  {
    paramShow: true,
    storeShow: true,
  },
  {
    paramShow: true,
    storeShow: false,
  },
  {
    paramShow: false,
    storeShow: true,
  },
  {
    paramShow: false,
    storeShow: false,
  },
];
describe("LoadingSpinner.svelte", () => {
  test.each<ShowParam>(showParams)(
    `show loader. paramShow=$paramShow, storeShow=$storeShow`,
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
