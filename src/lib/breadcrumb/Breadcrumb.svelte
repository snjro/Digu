<script lang="ts">
  import { basePath } from "#lib/common/basePath.js";
  import { page } from "$app/state";
  import { getPageChainName } from "#lib/common/pageChainName.js";
  import { trailingSlash } from "#lib/common/trailingSlash.js";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import BreadcrumbItems from "./BreadcrumbItems.svelte";
  import { getCrumbItems, type CrumbItem } from "./crumbs";

  let targetChainName = $derived(
    getPageChainName(
      page.params.chainName,
      $storeUserSettings.selectedChainName.toString(),
    ),
  );
  const crumbItems = (): CrumbItem[] => {
    return getCrumbItems(
      page.url.pathname,
      targetChainName,
      basePath,
      trailingSlash,
    );
  };
</script>

<nav
  class={classNames("mt-0.5", "mb-1", page.status !== 200 && "hidden", "")}
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
    {#each crumbItems() as crumbItem, i (crumbItem.href)}
      <BreadcrumbItems
        targetCrumbItem={crumbItem}
        currentIndex={i}
        lastIndex={crumbItems().length - 1}
      />
    {/each}
  </ol>
</nav>
