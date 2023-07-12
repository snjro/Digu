<script lang="ts">
  import BaseA, { type BaseAProps } from "$lib/base/BaseA.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import classNames from "classnames";

  export let text: NonNullable<BaseAProps["text"]>;
  export let href: BaseAProps["href"];
  export let textSize: BaseAProps["textSize"] = "md";
  export let forcedClass: BaseAProps["forcedClass"] = undefined;
  export let appendClass: BaseAProps["appendClass"] = undefined;
  export let withIcon: boolean = true;
  export let openNewTab: boolean = true;
  const suffixIcon = (): BaseIconProps | undefined => {
    return withIcon
      ? {
          name: iconName(),
          size: textSize,
          colorCategory: "interactive",
          appendClass: classNames("ml-1"),
        }
      : undefined;
  };
  const iconName = (): BaseIconProps["name"] => {
    return openNewTab ? "openInNew" : "link";
  };
</script>

<BaseA
  {href}
  {text}
  {textSize}
  {openNewTab}
  suffixIcon={suffixIcon()}
  {forcedClass}
  {appendClass}
/>
