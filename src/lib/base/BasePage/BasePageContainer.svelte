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

<div class={classNames("space-y-3", "h-fit", "w-full", "")}>
  <BasePageContainerTitle
    {titleText}
    {titleCategoryLabelText}
    isVerticalTitle={false}
  />
  <BasePageContainerContent bind:tabState>
    <slot />
  </BasePageContainerContent>
</div>
