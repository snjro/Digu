import { describe, expect, test } from "vitest";
import { GITHUB_PAGES_HOST_NAME, PROJECT_NAME } from "./utilsCostants";
import { NO_DATA } from "./utilsCostants";
import { DIR_NAME_CONTRACTS } from "./utilsCostants";
import { DIR_NAME_EVENTS } from "./utilsCostants";
import { DIR_NAME_FUNCTIONS } from "./utilsCostants";
type Constant = { constName: string; constValue: string };
const constants: Constant[] = [
  {
    constName: PROJECT_NAME,
    constValue: "digu",
  },
  {
    constName: NO_DATA,
    constValue: "-",
  },
  {
    constName: DIR_NAME_CONTRACTS,
    constValue: "contracts",
  },
  {
    constName: DIR_NAME_EVENTS,
    constValue: "events",
  },
  {
    constName: DIR_NAME_FUNCTIONS,
    constValue: "functions",
  },
  {
    constName: GITHUB_PAGES_HOST_NAME,
    constValue: "snjro.github.io",
  },
];
describe("constants", () => {
  test.each<Constant>(constants)(
    `value of "$constName" should be equal to "$constValue"`,
    ({ constName, constValue }: Constant) => {
      expect(constName).toEqual(constValue);
    },
  );
});
