import { EventFragment, FunctionFragment, Interface } from "ethers";
import { describe, expect, test } from "vitest";
import {
  formatTargetAbi,
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
    test("0: returns the fragments as they are", () => {
      expect(formatTargetAbi(contractInterface, 0)).toBe(
        contractInterface.fragments,
      );
    });
    test("1: returns the full human readable ABI", () => {
      expect(formatTargetAbi(contractInterface, 1)).toEqual([
        "event Transfer(address indexed from, address to, uint256 value)",
        "function balanceOf(address owner) view returns (uint256)",
      ]);
    });
    test.each([2, 3])(
      "%i: returns the minimal human readable ABI",
      (abiFormatIndex) => {
        expect(formatTargetAbi(contractInterface, abiFormatIndex)).toEqual([
          "event Transfer(address indexed,address,uint256)",
          "function balanceOf(address) view returns (uint256)",
        ]);
      },
    );
  });

  describe("fragment", () => {
    test("0: returns the fragment as it is", () => {
      expect(formatTargetAbi(eventFragment, 0)).toBe(eventFragment);
    });
    test("1: returns the full human readable fragment", () => {
      expect(formatTargetAbi(eventFragment, 1)).toBe(
        "event Transfer(address indexed from, address to, uint256 value)",
      );
      expect(formatTargetAbi(functionFragment, 1)).toBe(
        "function balanceOf(address owner) view returns (uint256)",
      );
    });
    test.each([2, 3])(
      "%i: returns the minimal human readable fragment",
      (abiFormatIndex) => {
        expect(formatTargetAbi(eventFragment, abiFormatIndex)).toBe(
          "event Transfer(address indexed,address,uint256)",
        );
        expect(formatTargetAbi(functionFragment, abiFormatIndex)).toBe(
          "function balanceOf(address) view returns (uint256)",
        );
      },
    );
  });
});

describe("getAbiText", () => {
  test("expanded: indents with 2 spaces", () => {
    expect(getAbiText(contractInterface, 1, true)).toBe(
      [
        "[",
        '  "event Transfer(address indexed from, address to, uint256 value)",',
        '  "function balanceOf(address owner) view returns (uint256)"',
        "]",
      ].join("\n"),
    );
  });
  test("not expanded: has no line breaks", () => {
    expect(getAbiText(contractInterface, 1, false)).toBe(
      '["event Transfer(address indexed from, address to, uint256 value)","function balanceOf(address owner) view returns (uint256)"]',
    );
  });
  test("minimal fragment is a JSON string", () => {
    expect(getAbiText(functionFragment, 2, false)).toBe(
      '"function balanceOf(address) view returns (uint256)"',
    );
  });
  test("JSON of a fragment has its type and name", () => {
    const abiText: string = getAbiText(eventFragment, 0, false);
    expect(abiText).not.toContain("\n");
    expect(JSON.parse(abiText)).toMatchObject({
      type: "event",
      name: "Transfer",
    });
  });
  test("JSON of a contract interface is the list of fragments", () => {
    const abiText: string = getAbiText(contractInterface, 0, true);
    expect(abiText).toContain("\n");
    expect(JSON.parse(abiText)).toMatchObject([
      { type: "event", name: "Transfer" },
      { type: "function", name: "balanceOf" },
    ]);
  });
});
