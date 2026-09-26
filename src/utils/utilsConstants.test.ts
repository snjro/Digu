import { describe, expect, test } from "vitest";
import {
  GITHUB_OWNER_NAME,
  GITHUB_REPOSITORY_URL,
  PROJECT_NAME,
} from "./utilsConstants";
import { NO_DATA } from "./utilsConstants";
import { DIR_NAME_CONTRACTS } from "./utilsConstants";
import { DIR_NAME_EVENTS } from "./utilsConstants";
import { DIR_NAME_FUNCTIONS } from "./utilsConstants";
type Constant = { constName: string; constValue: string };
const constants: Constant[] = [
  {
    constName: PROJECT_NAME,
    constValue: "Digu",
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
    constName: GITHUB_OWNER_NAME,
    constValue: "snjro",
  },
  {
    constName: GITHUB_REPOSITORY_URL,
    constValue: `https://github.com/${GITHUB_OWNER_NAME}/${PROJECT_NAME}`,
  },
];
describe("constants", () => {
  test.each<Constant>(constants)(
    `value of "constName" should be equal to "constValue"`,
    ({ constName, constValue }: Constant) => {
      expect(constName).toEqual(constValue);
    },
  );
});
