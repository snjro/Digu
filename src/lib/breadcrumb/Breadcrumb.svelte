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
  import { tabValuesForContract } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/+page.svelte";
  import { tabValuesForEvent } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/+page.svelte";
  import { tabValuesForFunction } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/functions/[functionName]/+page.svelte";
  import { convertToKebabCase } from "@utils/utilsCommon";
  import { getSplittedFunctionNameAndSelector } from "$lib/leftSidebar/Body/ItemEventsFunctions.svelte";

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
      const previousPathName: string = pathNames[indexPathNames - 1];
      const currentPathName: string = pathNames[indexPathNames];
      const PathNameWithUrlHash = getPathNameWithUrlHash(
        previousPathName,
        currentPathName
      );

      const currentPathNameWithoutFunctionSelector: string =
        previousPathName === "functions"
          ? getSplittedFunctionNameAndSelector(currentPathName).functionName
          : currentPathName;
      href = `${removeUrlHash(href)}/${PathNameWithUrlHash}`;
      text = convertUrlTextToLabelText(currentPathNameWithoutFunctionSelector);
      prefixIconName = undefined;
      if (text) {
        crumbs.push({ href: href, text: text, prefixIconName: prefixIconName });
      }
    }
    return crumbs;
  };
  function removeUrlHash(href: string): string {
    const hashStartIndex: number = href.indexOf("#");
    return hashStartIndex > 0 ? href.substring(0, hashStartIndex) : href;
  }
  function getPathNameWithUrlHash(
    previousPathName: string,
    currentPathName: string
  ): string {
    let urlHash: string = "";
    // if (indexPathNames === pathNames.length - 1) {
    switch (previousPathName) {
      case "contracts":
        urlHash = tabValuesForContract[0];
        break;
      case "events":
        urlHash = tabValuesForEvent[0];
        break;
      case "functions":
        urlHash = tabValuesForFunction[0];
        break;
      default:
        urlHash = "";
        break;
    }
    if (urlHash) {
      urlHash = `#${convertToKebabCase(urlHash)}`;
    }
    // }
    return currentPathName + urlHash;
  }
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
  class={classNames("flex", "mb-1.5", $page.status !== 200 && "hidden")}
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
