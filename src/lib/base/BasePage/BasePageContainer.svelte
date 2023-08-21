<script
  lang="ts"
  generics=" TabState extends  TabStateContract|TabStateEvent|TabStateFunction"
>
  import classNames from "classnames";
  import BasePageContainerTitle from "$lib/base/BasePage/BasePageContainerTitle.svelte";
  import BasePageContainerContent, {
    type TabStateContract,
    type TabStateEvent,
    type TabStateFunction,
  } from "./BasePageContainerContent.svelte";

  export let titleText: string;
  export let titleCategoryLabelText: string;
  export let tabState: TabState | undefined = undefined;
</script>

<div class={classNames("min-h-0", "h-full", "w-full", "flex", "flex-col")}>
  <BasePageContainerTitle {titleText} {titleCategoryLabelText} />
  <BasePageContainerContent bind:tabState>
    <slot />
  </BasePageContainerContent>
</div>
