import { EventFragment, FunctionFragment, Interface } from "ethers";
import { describe, expect, test } from "vitest";
import type { AbiFormatType } from "@utils/utilsEthers";
import {
  formatTargetAbi,
  getAbiExportTooltipText,
  getAbiFileExtension,
  getAbiText,
  isTargetContractInterface,
} from "./abiText";

const EVENT_SIGNATURE =
  "event Transfer(address indexed from, address to, uint256 value)";
const FUNCTION_SIGNATURE =
  "function balanceOf(address owner) view returns (uint256)";

const contractInterface = new Interface([EVENT_SIGNATURE, FUNCTION_SIGNATURE]);
const eventFragment = EventFragment.from(EVENT_SIGNATURE);
const functionFragment = FunctionFragment.from(FUNCTION_SIGNATURE);

describe("isTargetContractInterface", () => {
  test("returns true for a contract interface", () => {
    expect(isTargetContractInterface(contractInterface)).toBe(true);
  });
  test.each([
    ["event", eventFragment],
    ["function", functionFragment],
  ])("returns false for a %s fragment", (_, fragment) => {
    expect(isTargetContractInterface(fragment)).toBe(false);
  });
});

describe("formatTargetAbi", () => {
  describe("contract interface", () => {
    test("json: returns the fragments as they are", () => {
      expect(formatTargetAbi(contractInterface, "json")).toBe(
        contractInterface.fragments,
      );
    });
    test("full: returns the full human readable ABI", () => {
      expect(formatTargetAbi(contractInterface, "full")).toEqual([
        "event Transfer(address indexed from, address to, uint256 value)",
        "function balanceOf(address owner) view returns (uint256)",
      ]);
    });
    test("minimal: returns the minimal human readable ABI", () => {
      expect(formatTargetAbi(contractInterface, "minimal")).toEqual([
        "event Transfer(address indexed,address,uint256)",
        "function balanceOf(address) view returns (uint256)",
      ]);
    });
  });

  describe("fragment", () => {
    test("json: returns the fragment as it is", () => {
      expect(formatTargetAbi(eventFragment, "json")).toBe(eventFragment);
    });
    test("full: returns the full human readable fragment", () => {
      expect(formatTargetAbi(eventFragment, "full")).toBe(
        "event Transfer(address indexed from, address to, uint256 value)",
      );
      expect(formatTargetAbi(functionFragment, "full")).toBe(
        "function balanceOf(address owner) view returns (uint256)",
      );
    });
    test("minimal: returns the minimal human readable fragment", () => {
      expect(formatTargetAbi(eventFragment, "minimal")).toBe(
        "event Transfer(address indexed,address,uint256)",
      );
      expect(formatTargetAbi(functionFragment, "minimal")).toBe(
        "function balanceOf(address) view returns (uint256)",
      );
    });
  });
});

describe("getAbiText", () => {
  test("expanded: indents with 2 spaces", () => {
    expect(getAbiText(contractInterface, "full", true)).toBe(
      [
        "[",
        '  "event Transfer(address indexed from, address to, uint256 value)",',
        '  "function balanceOf(address owner) view returns (uint256)"',
        "]",
      ].join("\n"),
    );
  });
  test("not expanded: has no line breaks", () => {
    expect(getAbiText(contractInterface, "full", false)).toBe(
      '["event Transfer(address indexed from, address to, uint256 value)","function balanceOf(address owner) view returns (uint256)"]',
    );
  });
  test("minimal fragment is a JSON string", () => {
    expect(getAbiText(functionFragment, "minimal", false)).toBe(
      '"function balanceOf(address) view returns (uint256)"',
    );
  });
  test("JSON of a fragment has its type and name", () => {
    const abiText: string = getAbiText(eventFragment, "json", false);
    expect(abiText).not.toContain("\n");
    expect(JSON.parse(abiText)).toMatchObject({
      type: "event",
      name: "Transfer",
    });
  });
  test("JSON of a contract interface is the list of fragments", () => {
    const abiText: string = getAbiText(contractInterface, "json", true);
    expect(abiText).toContain("\n");
    expect(JSON.parse(abiText)).toMatchObject([
      { type: "event", name: "Transfer" },
      { type: "function", name: "balanceOf" },
    ]);
  });
});

describe("getAbiFileExtension", () => {
  test("returns json for the JSON format", () => {
    expect(getAbiFileExtension("json")).toBe("json");
  });
  test.each<AbiFormatType>(["full", "minimal"])(
    "returns txt for the human readable format %s",
    (abiFormat) => {
      expect(getAbiFileExtension(abiFormat)).toBe("txt");
    },
  );
});

describe("getAbiExportTooltipText", () => {
  test("returns Export as JSON for the JSON format", () => {
    expect(getAbiExportTooltipText("json")).toBe("Export as JSON");
  });
  test.each<AbiFormatType>(["full", "minimal"])(
    "returns Export as text for the human readable format %s",
    (abiFormat) => {
      expect(getAbiExportTooltipText(abiFormat)).toBe("Export as text");
    },
  );
});
