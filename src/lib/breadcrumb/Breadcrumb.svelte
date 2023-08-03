<script lang="ts" context="module">
  export type CrumbItem = {
    href: string;
    text: string;
    prefixIconName: BaseIconProps["name"] | undefined;
  };
</script>

<script lang="ts">
  import { page } from "$app/stores";
  import classNames from "classnames";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { directoryItems } from "$lib/leftSidebar/Body/directoryDefinitions";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { convertToKebabCase } from "@utils/utilsCommon";
  import { getSplittedFunctionNameAndSelector } from "$lib/leftSidebar/Body/ItemEventsFunctions.svelte";
  import BreadcrumbItems from "./BreadcrumbItems.svelte";
  import {
    TAB_VALUES_CONTRACT,
    TAB_VALUES_EVENT,
    TAB_VALUES_FUNCTION,
  } from "$lib/base/BasePage/BasePageContainerContent.svelte";

  $: targetChainName = $storeUserSettings.selectedChainName.toString();

  $: crumbItems = (): CrumbItem[] => {
    let crumbItems: CrumbItem[] = [];
    let href: CrumbItem["href"] = `/${targetChainName}`;
    //
    let text: CrumbItem["text"] = directoryItems.home.label;
    let prefixIconName: CrumbItem["prefixIconName"] =
      directoryItems.home.iconName;
    crumbItems.push({ href: href, text: text, prefixIconName: prefixIconName });
    const pathNames: string[] = $page.url.pathname.split("/");
    for (
      let indexPathNames = 2;
      indexPathNames < pathNames.length;
      indexPathNames++
    ) {
      const previousPathName: string = pathNames[indexPathNames - 1];
      const currentPathName: string = pathNames[indexPathNames];
      const currentPathNameWithUrlHash = getPathNameWithUrlHash(
        previousPathName,
        currentPathName
      );

      const currentPathNameWithoutFunctionSelector: string =
        previousPathName === "functions"
          ? getSplittedFunctionNameAndSelector(currentPathName).functionName
          : currentPathName;
      href = `${removeUrlHash(href)}/${currentPathNameWithUrlHash}`;
      text = convertUrlTextToLabelText(currentPathNameWithoutFunctionSelector);
      prefixIconName = undefined;
      if (text) {
        crumbItems.push({
          href: href,
          text: text,
          prefixIconName: prefixIconName,
        });
      }
    }
    return crumbItems;
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
        urlHash = TAB_VALUES_CONTRACT[0];
        break;
      case "events":
        urlHash = TAB_VALUES_EVENT[0];
        break;
      case "functions":
        urlHash = TAB_VALUES_FUNCTION[0];
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
</script>

<nav
  class={classNames(
    "flex",
    "mt-0.5 mb-3",
    $page.status !== 200 && "hidden",
    ""
  )}
  aria-label="Breadcrumb"
>
  <ol
    class={classNames(
      "flex",
      "flex-row",
      "flex-wrap",
      "items-center",
      "space-x-0.5",
      "overflow-x-hidden",
      ""
    )}
  >
    {#each crumbItems() as crumbItem, i}
      <BreadcrumbItems
        targetCrumbItem={crumbItem}
        currentIndex={i}
        lastIndex={crumbItems().length - 1}
      />
    {/each}
  </ol>
</nav>
