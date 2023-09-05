<script lang="ts">
  import BaseButton from "$lib/base/BaseButton.svelte";

  function testFunc() {
    console.log("text");
  }
</script>

<div class="p-8">
  <BaseButton label="test" on:click={testFunc} />
</div>
