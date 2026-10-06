import type { AbiFragmentsType } from "#lib/contracts/abiFragmentsType.js";
import { convertToKebabCase } from "#utils/utilsCommon.js";

export const TAB_VALUES_COMMON = ["Overview", "ABI"] as const;
export const TAB_VALUES_CONTRACT = TAB_VALUES_COMMON;
export const TAB_VALUES_EVENT = [...TAB_VALUES_COMMON, "Event Logs"] as const;
export const TAB_VALUES_FUNCTION = TAB_VALUES_COMMON;

export type TabsDefinitionContract = {
  selected: (typeof TAB_VALUES_CONTRACT)[number];
  values: typeof TAB_VALUES_CONTRACT;
  groupName: "tabGroupContract";
};
export type TabsDefinitionEvent = {
  selected: (typeof TAB_VALUES_EVENT)[number];
  values: typeof TAB_VALUES_EVENT;
  groupName: "tabGroupEvent";
};
export type TabsDefinitionFunction = {
  selected: (typeof TAB_VALUES_FUNCTION)[number];
  values: typeof TAB_VALUES_FUNCTION;
  groupName: "tabGroupFunction";
};

export function convertTabValueForHref<
  TabsDefinition extends
    TabsDefinitionContract | TabsDefinitionEvent | TabsDefinitionFunction,
>(tabValue: TabsDefinition["values"][number]): `#${string}` {
  const convertedTabValue: string = convertToKebabCase(tabValue as string);
  return `#${convertedTabValue}`;
}

// The URL hash without "#" of the first tab of the contract, event or function page.
export function getFirstTabUrlHash(
  pageType: "contracts" | AbiFragmentsType,
): string {
  const tabValues = {
    contracts: TAB_VALUES_CONTRACT,
    events: TAB_VALUES_EVENT,
    functions: TAB_VALUES_FUNCTION,
  }[pageType];
  return convertToKebabCase(tabValues[0]);
}
