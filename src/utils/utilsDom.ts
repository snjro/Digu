import { browser } from "$app/environment";

export type VerticalViewability =
  | "hiddenInTop"
  | "viewable"
  | "hiddenInBottom"
  | undefined;
export function getVerticalViewabilityInScroll(
  parentElement: HTMLElement | null,
  childElement: HTMLElement
): VerticalViewability {
  let verticalViewability: VerticalViewability = undefined;

  if (parentElement && childElement) {
    const parentRect: DOMRect = parentElement.getBoundingClientRect();
    const childRect: DOMRect = childElement.getBoundingClientRect();

    if (childRect.top < parentRect.top) {
      verticalViewability = "hiddenInTop";
    } else if (
      childRect.top >= parentRect.top &&
      childRect.bottom <= parentRect.bottom
    ) {
      verticalViewability = "viewable";
    } else {
      verticalViewability = "hiddenInBottom";
    }
  }
  return verticalViewability;
}

export function getScreenWidth(): number {
  let screenWidth = 0;
  if (browser) {
    screenWidth = window.innerWidth;
  }
  return screenWidth;
}
