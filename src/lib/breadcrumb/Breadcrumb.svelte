<script lang="ts">
  import { page } from "$app/stores";
  import BaseA from "$lib/base/BaseA.svelte";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { directoryItems } from "$lib/leftSidebar/Body/directoryDefinitions";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  $: targetChainName = $storeUserSettings.selectedChainName.toString();

  const liStyle: string = classNames("inline-block", "align-top", "");
  const textSize: BaseSize = "sm";
  type Crumb = {
    href: string;
    text: string;
    prefixIconName: BaseIconProps["name"] | undefined;
  };
  $: crumbs = (): Crumb[] => {
    let crumbs: Crumb[] = [];
    let href: Crumb["href"] = `/${targetChainName}`;
    let text: Crumb["text"] = directoryItems.home.label;
    let prefixIconName: Crumb["prefixIconName"] = directoryItems.home.iconName;
    crumbs.push({ href: href, text: text, prefixIconName: prefixIconName });
    const pathNames: string[] = $page.url.pathname.split("/");
    for (
      let indexPathNames = 2;
      indexPathNames < pathNames.length;
      indexPathNames++
    ) {
      href = `${href}/${pathNames[indexPathNames]}`;
      text = convertUrlTextToLabelText(pathNames[indexPathNames]);
      prefixIconName = undefined;
      if (text) {
        crumbs.push({ href: href, text: text, prefixIconName: prefixIconName });
      }
    }
    return crumbs;
  };
  function convertUrlTextToLabelText(path: string): string {
    if (path in directoryItems) {
      return directoryItems[path].label;
    } else {
      // return capitalizeFirstLetter(path.replaceAll("-", " "));
      return path.replaceAll("-", " ");
    }
  }
  const prefixIcon = (
    prefixIconName: Crumb["prefixIconName"],
    isLabel: boolean
  ): BaseIconProps | undefined => {
    if (prefixIconName) {
      return {
        name: prefixIconName,
        size: textSize,
        colorCategory: isLabel ? colorSettings.main : "interactive",
      };
    } else {
      return undefined;
    }
  };
</script>

<nav
  class={classNames("flex", "mb-1.5", $page.status === 404 && "hidden")}
  aria-label="Breadcrumb"
>
  <ol class={classNames("")}>
    {#each crumbs() as crumb, i}
      {#if i === crumbs().length - 1}
        <li class={classNames(liStyle)}>
          <BaseLabel
            text={crumb.text}
            {textSize}
            prefixIcon={prefixIcon(crumb.prefixIconName, true)}
          />
        </li>
      {:else}
        <li class={classNames(liStyle)}>
          <BaseA
            text={crumb.text}
            {textSize}
            prefixIcon={prefixIcon(crumb.prefixIconName, false)}
            href={crumb.href}
            openNewTab={false}
            hoverEffect={true}
          />
        </li>
        <li class={classNames(liStyle)}>
          <BaseIcon
            name="menuRight"
            size={changeSize(textSize, 2)}
            colorCategory={colorSettings.main}
            hoverEffect={false}
          />
        </li>
      {/if}
    {/each}
  </ol>
</nav>
