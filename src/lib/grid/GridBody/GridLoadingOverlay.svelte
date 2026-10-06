<script lang="ts">
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import BaseSpinner from "#lib/base/BaseSpinner.svelte";
  import classNames from "classnames";

  interface Props {
    text: string | undefined;
  }

  let { text }: Props = $props();
</script>

<div class={classNames("flex", "flex-col", "items-center", "gap-y-2")}>
  <BaseSpinner size="xl" trackColor="primary" />
  {#if text}
    <BaseLabel {text} textSize={sizeSettings.grid} />
  {/if}
</div>
