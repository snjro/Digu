import { convertToKebabCase } from "@utils/utilsCommon";

export const TAB_VALUES_COMMON = ["Overview", "ABI"] as const;
export const TAB_VALUES_CONTRACT = TAB_VALUES_COMMON;
export const TAB_VALUES_EVENT = [
  ...TAB_VALUES_COMMON,
  "Event Logs (text)",
  "Event Logs (hex)",
] as const;
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
  let convertedTabValue: string = convertToKebabCase(tabValue as string);
  convertedTabValue = convertedTabValue.replace("(", "").replace(")", "");
  return `#${convertedTabValue}`;
}
