<script lang="ts">
  import BaseButton from "$lib/base/BaseButton.svelte";
  import {
    updateDbItemRpcSettings,
    updateDbItemUserSettings,
  } from "@db/dbSettingsDataHandlers";
  async function update() {
    await updateDbItemRpcSettings("matic", "tryCount", 3);
    await updateDbItemUserSettings("themeColor", "dark");
    await updateDbItemUserSettings("devMode", true);
  }

  function testFunc() {
    console.log("text");
  }
</script>

<div class="p-8">
  <BaseButton label="update" on:click={update} />
  <BaseButton label="test" on:click={testFunc} />
</div>
