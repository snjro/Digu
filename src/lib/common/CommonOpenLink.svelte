<script lang="ts">
  import BaseA, { type BaseAProps } from "$lib/base/BaseA.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import classNames from "classnames";

  interface Props {
    text: NonNullable<BaseAProps["text"]>;
    href: BaseAProps["href"];
    textSize?: BaseAProps["textSize"];
    forcedClass?: BaseAProps["forcedClass"];
    appendClass?: BaseAProps["appendClass"];
    withIcon?: boolean;
    openNewTab?: boolean;
  }

  let {
    text,
    href,
    textSize = "md",
    forcedClass = undefined,
    appendClass = undefined,
    withIcon = true,
    openNewTab = true,
  }: Props = $props();
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
