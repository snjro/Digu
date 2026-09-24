<script lang="ts">
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { trailingSlash } from "@routes/+layout";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import BreadcrumbItems from "./BreadcrumbItems.svelte";
  import { getCrumbItems, type CrumbItem } from "./crumbs";

  let targetChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  const crumbItems = (): CrumbItem[] => {
    return getCrumbItems(
      page.url.pathname,
      targetChainName,
      base,
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
    {#each crumbItems() as crumbItem, i}
      <BreadcrumbItems
        targetCrumbItem={crumbItem}
        currentIndex={i}
        lastIndex={crumbItems().length - 1}
      />
    {/each}
  </ol>
</nav>
