<script lang="ts">
  import BaseButton from "$lib/base/BaseButton.svelte";
  function testFunc() {
    console.log("test");
  }
</script>

<div class="p-8">
  <BaseButton
    label="test Btn"
    on:click={testFunc}
    border
    colorCategoryFront="interactive"
  />
</div>
