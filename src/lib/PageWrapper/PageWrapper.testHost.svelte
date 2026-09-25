<script lang="ts">
  import PageWrapper from "./PageWrapper.svelte";
  import { TAB_VALUES_CONTRACT, type TabsDefinitionContract } from "./tabs";

  let tabsDefinition: TabsDefinitionContract = $state({
    selected: "Overview",
    values: TAB_VALUES_CONTRACT,
    groupName: "tabGroupContract",
  });
</script>

<PageWrapper bind:tabsDefinition />
<span data-testid="selected">{tabsDefinition.selected}</span>
