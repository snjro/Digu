<script lang="ts">
  import classNames from "classnames";

  interface Props {
    bgColor: `bg-${string}` | undefined;
    height: `h-${string}`;
  }

  let { bgColor, height }: Props = $props();
</script>

<div class={classNames(bgColor, height, "w-full")}></div>
