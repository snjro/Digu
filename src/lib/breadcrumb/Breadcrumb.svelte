<script lang="ts" context="module">
  export type CrumbItem = {
    href: string;
    text: string | undefined;
    prefixIconName: BaseIconProps["name"] | undefined;
  };
</script>

<script lang="ts">
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import {
    TAB_VALUES_CONTRACT,
    TAB_VALUES_EVENT,
    TAB_VALUES_FUNCTION,
  } from "$lib/PageWrapper/PageWrapper.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { getSplittedFunctionNameAndSelector } from "$lib/leftSidebar/Body/functionNameHandler";
  import { trailingSlash } from "@routes/+layout";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { convertToKebabCase } from "@utils/utilsCommon";
  import {
    DIR_NAME_CONTRACTS,
    DIR_NAME_EVENTS,
    DIR_NAME_FUNCTIONS,
  } from "@utils/utilsCostants";
  import classNames from "classnames";
  import BreadcrumbItems from "./BreadcrumbItems.svelte";

  $: targetChainName = $storeUserSettings.selectedChainName.toString();

  $: crumbItems = (): CrumbItem[] => {
    let crumbItems: CrumbItem[] = [];
    let href: CrumbItem["href"] = `${base}/${targetChainName}`;
    let text: CrumbItem["text"] = undefined;
    let prefixIconName: CrumbItem["prefixIconName"] = "home";
    crumbItems.push({ href: href, text: text, prefixIconName: prefixIconName });

    // remove trailing slash
    const pathName: string =
      trailingSlash === "always"
        ? $page.url.pathname.slice(0, -1)
        : $page.url.pathname;

    const pathNames: string[] = pathName.split("/");

    const startIndex: number = pathNames.indexOf(targetChainName) + 1;
    for (
      let indexPathNames = startIndex;
      indexPathNames < pathNames.length;
      indexPathNames++
    ) {
      const previousPathName: string = pathNames[indexPathNames - 1];
      const currentPathName: string = pathNames[indexPathNames];
      const currentPathNameWithUrlHash = getPathNameWithUrlHash(
        previousPathName,
        currentPathName,
      );

      const currentPathNameWithoutFunctionSelector: string =
        previousPathName === DIR_NAME_FUNCTIONS
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
    currentPathName: string,
  ): string {
    let urlHash: string = "";
    // if (indexPathNames === pathNames.length - 1) {
    switch (previousPathName) {
      case DIR_NAME_CONTRACTS:
        urlHash = TAB_VALUES_CONTRACT[0];
        break;
      case DIR_NAME_EVENTS:
        urlHash = TAB_VALUES_EVENT[0];
        break;
      case DIR_NAME_FUNCTIONS:
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
    return path.replaceAll("-", " ");
  }
</script>

<nav
  class={classNames("mt-0.5", "mb-1", $page.status !== 200 && "hidden", "")}
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
      "",
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
