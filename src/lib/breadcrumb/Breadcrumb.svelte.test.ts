import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import Breadcrumb from "./Breadcrumb.svelte";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";

vi.mock("$app/state", () => ({
  page: {
    url: new URL("http://localhost/matic/proj-v1/"),
    params: { chainName: "matic", projectName_versionName: "proj-v1" },
    status: 200,
  },
}));
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("@routes/+layout", () => ({ trailingSlash: "always" }));

describe("Breadcrumb.svelte", () => {
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
  });

  test("builds the links from the chain in the URL, not the saved one", () => {
    storeUserSettings.updateState({ selectedChainName: "eth" });
    const { container } = render(Breadcrumb);
    const hrefs = [...container.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    // The last crumb is a label, not a link.
    expect(hrefs).toEqual(["/matic"]);
    expect(container.textContent).toContain("proj v1");
    expect(container.textContent).not.toContain("matic");
  });

  test("puts only <li> in the list", () => {
    const { container } = render(Breadcrumb);
    const children = [...container.querySelector("ol")!.children];
    // home, separator, last label
    expect(children.map((child) => child.tagName)).toEqual(["LI", "LI", "LI"]);
  });
});
