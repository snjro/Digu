<script lang="ts">
  import classNames from "classnames";

  export let bgColor: `bg-${string}` | undefined;
  export let height: `h-${string}`;
</script>

<div class={classNames(bgColor, height, "w-full")} />
