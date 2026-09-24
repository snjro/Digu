import { afterEach, describe, expect, test } from "vitest";
import { tick, type ComponentProps } from "svelte";
import { render } from "@testing-library/svelte";
import BaseItemIndicator from "./BaseItemIndicator.svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";

type Props = ComponentProps<typeof BaseItemIndicator>;
const props: Props = {
  isSelected: false,
  isHover: false,
  isUpdated: false,
  invisible: false,
  isTopLevelItem: false,
};

type Parts = {
  root: HTMLElement;
  left: HTMLElement;
  center: HTMLElement;
  right: HTMLElement;
};
function getParts(container: HTMLElement): Parts {
  const root = container.firstElementChild as HTMLElement;
  const [left, center, right] = [...root.children] as HTMLElement[];
  return { root, left, center, right };
}
const bg = (
  theme: "light" | "dark",
  isSelected: boolean,
  key: "bg" | "bgEmphasis",
): string =>
  colorDefinitions[theme][
    isSelected ? "interactive" : colorSettings.dialogHeader
  ][key];

type Shape = {
  name: string;
  props: Partial<Props>;
  height: string;
  center: string[];
  right: string;
};
const shapes: Shape[] = [
  {
    name: "normal",
    props: {},
    height: "self-stretch",
    center: ["w-px", "rounded-none"],
    right: "pr-[7px]",
  },
  {
    name: "hovered",
    props: { isHover: true },
    height: "h-4/5",
    center: ["w-[2px]", "rounded-none"],
    right: "pr-[6px]",
  },
  {
    name: "updated",
    props: { isUpdated: true, isHover: true },
    height: "h-1/3",
    center: ["w-[6px]", "rounded-tr-full"],
    right: "pr-[2px]",
  },
  {
    name: "selected",
    props: { isSelected: true, isUpdated: true, isHover: true },
    height: "h-4/6",
    center: ["w-[4px]", "rounded-tr-full"],
    right: "pr-[4px]",
  },
];

describe("BaseItemIndicator.svelte", () => {
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
  });

  test.each<Shape>(shapes)(
    "has the shape of the state. $name",
    ({ props: stateProps, height, center, right }) => {
      const { container } = render(BaseItemIndicator, {
        ...props,
        ...stateProps,
      });
      const parts = getParts(container);
      expect(parts.root.classList).toContain(height);
      for (const c of center) expect(parts.center.classList).toContain(c);
      expect(parts.right.classList).toContain(right);
    },
  );

  test("follows a change of the props", async () => {
    const { container, rerender } = render(BaseItemIndicator, props);
    for (const { props: stateProps, height, right } of shapes) {
      await rerender({ ...props, ...stateProps });
      const parts = getParts(container);
      expect(parts.root.classList).toContain(height);
      expect(parts.right.classList).toContain(right);
    }
  });

  test.each([
    { isSelected: false, isHover: false, key: "bg" },
    { isSelected: false, isHover: true, key: "bgEmphasis" },
    { isSelected: true, isHover: false, key: "bg" },
    { isSelected: true, isHover: true, key: "bgEmphasis" },
  ] as const)(
    "colors the center by the state. isSelected=$isSelected isHover=$isHover",
    async ({ isSelected, isHover, key }) => {
      const { container, rerender } = render(BaseItemIndicator, props);
      await rerender({ ...props, isSelected, isHover });
      expect(getParts(container).center.classList).toContain(
        bg("light", isSelected, key),
      );
    },
  );

  test("follows the theme in storeUserSettings", async () => {
    const { container } = render(BaseItemIndicator, {
      ...props,
      isSelected: true,
    });
    expect(getParts(container).center.classList).toContain(
      bg("light", true, "bg"),
    );

    storeUserSettings.update((s) => ({ ...s, themeColor: "dark" }));
    await tick();
    expect(getParts(container).center.classList).toContain(
      bg("dark", true, "bg"),
    );
  });

  test("pads the left side less for a top level item", async () => {
    const { container, rerender } = render(BaseItemIndicator, props);
    expect(getParts(container).left.classList).toContain("pl-1.5");

    await rerender({ ...props, isTopLevelItem: true });
    expect(getParts(container).left.classList).toContain("pl-0.5");
  });

  test("hides the line only in the normal state when invisible", async () => {
    const { container, rerender } = render(BaseItemIndicator, {
      ...props,
      invisible: true,
    });
    expect(getParts(container).center.classList).toContain("invisible");

    await rerender({ ...props, invisible: true, isHover: true });
    expect(getParts(container).center.classList).not.toContain("invisible");
  });
});
