<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { numberWithCommas } from "@utils/utilsCommon";
  import classNames from "classnames";

  export let rowsLength: number;
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    "justify-end",
    "space-x-1"
  )}
>
  <BaseLabel text="Rows:" />
  <BaseLabel text={numberWithCommas(rowsLength)} />
</div>
