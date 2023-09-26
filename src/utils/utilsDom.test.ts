import { beforeAll, describe, expect, test, vi } from "vitest";
import {
  getScreenWidth,
  getVerticalViewabilityInScroll,
  type VerticalViewability,
} from "./utilsDom";
import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";

vi.mock("$app/environment", () => {
  return {
    browser: true,
  };
});

type ElementStyle = { top: number; buttom: number };
type FamilyStyle = {
  parent: ElementStyle;
  child: ElementStyle;
  expected: VerticalViewability;
  condition: string;
};
// 新たな型を定義
declare global {
  interface Window {
    exposedGetVerticalViewabilityInScroll: (
      parentElement: HTMLElement | null,
      childElement: HTMLElement,
    ) => VerticalViewability;
  }
}
let parentElement: HTMLDivElement;
let childElement: HTMLDivElement;

describe('"getVerticalViewabilityInScroll"', () => {
  let browser: Browser;
  let page: Page;
  const familiesStyle: FamilyStyle[] = [
    //Same size for parent and child
    {
      // In position, parent and child are the same
      parent: { top: 1, buttom: 5 },
      child: { top: 1, buttom: 5 },
      expected: "viewable",
      condition: "#1-1 parent and child are the same size & the same position",
    },
    {
      // In position, parent is lower
      parent: { top: 2, buttom: 6 },
      child: { top: 1, buttom: 5 },
      expected: "hiddenInTop",
      condition: "#1-2 parent and child are the same size & parent is lower",
    },
    {
      // In position, parent is higher
      parent: { top: 1, buttom: 5 },
      child: { top: 2, buttom: 6 },
      expected: "hiddenInBottom",
      condition: "#1-3 parent and child are the same size & parent is higher",
    },

    //Parent is vertically longer
    {
      // In position, parent and child are the same
      parent: { top: 1, buttom: 6 },
      child: { top: 1, buttom: 5 },
      expected: "viewable",
      condition: "#2-1 parent is longer & the same position",
    },
    {
      // In position, parent is lower
      parent: { top: 2, buttom: 7 },
      child: { top: 1, buttom: 5 },
      expected: "hiddenInTop",
      condition: "#2-2 parent is longer & parent is lower",
    },
    {
      // In position, parent is higher
      parent: { top: 1, buttom: 6 },
      child: { top: 2, buttom: 6 },
      expected: "viewable",
      condition: "#2-3 parent is longer & parent is higher",
    },

    //Parent is vertically shorter
    {
      // In position, parent and child are the same
      parent: { top: 1, buttom: 5 },
      child: { top: 1, buttom: 6 },
      expected: "hiddenInBottom",
      condition: "#3-1 parent is shorter & the same position",
    },
    {
      // In position, parent is lower
      parent: { top: 2, buttom: 6 },
      child: { top: 1, buttom: 6 },
      expected: "hiddenInTop",
      condition: "#3-2 parent is shorter & parent is lower",
    },
    {
      // In position, parent is higher
      parent: { top: 1, buttom: 5 },
      child: { top: 2, buttom: 7 },
      expected: "hiddenInBottom",
      condition: "#3-3 parent is shorter & parent is higher",
    },
  ];

  beforeAll(async (): Promise<void> => {
    browser = await puppeteer.launch({ headless: "new" });
    page = await browser.newPage();
    await page.exposeFunction(
      "exposedGetVerticalViewabilityInScroll",
      (parentElement: HTMLElement, childElement: HTMLElement) => {
        getVerticalViewabilityInScroll(parentElement, childElement);
      },
    );
  });
  test.each<FamilyStyle>(familiesStyle)(
    `should return $expected when $condition`,
    async ({ parent, child, expected }: FamilyStyle) => {
      parentElement = document.createElement("div");
      childElement = document.createElement("div");
      parentElement.getBoundingClientRect = vi.fn(
        (): DOMRect => ({
          top: parent.top,
          bottom: parent.buttom,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          left: 0,
          right: 0,
          toJSON: () => {},
        }),
      );
      childElement.getBoundingClientRect = vi.fn(
        (): DOMRect => ({
          top: child.top,
          bottom: child.buttom,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          left: 0,
          right: 0,
          toJSON: () => {},
        }),
      );
      const viewability: VerticalViewability = getVerticalViewabilityInScroll(
        parentElement,
        childElement,
      );
      expect(viewability).toBe(expected);
    },
  );
});
describe("getScreenWidth", () => {
  test(`"getScreenWidth" should return correct screen width`, () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });
    const width = getScreenWidth();
    expect(width).toBe(500);
  });
});
