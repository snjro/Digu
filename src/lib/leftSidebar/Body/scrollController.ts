import type { OpenStateLeftSidebarAccordion } from "@stores/storeNoDb";
import {
  getVerticalViewabilityInScroll,
  type VerticalViewability,
} from "@utils/utilsDom";

export function setChildElementInScroll(
  browser: boolean,
  isSelected: boolean,
  parentElement: HTMLElement | null,
  childElement: HTMLElement | null,
  headerElement: HTMLElement | null,
  storeNoDbOpenLeftSidebarAccordion: OpenStateLeftSidebarAccordion
): void {
  if (
    browser &&
    isSelected &&
    childElement &&
    parentElement &&
    headerElement &&
    !storeNoDbOpenLeftSidebarAccordion
  ) {
    const verticalViewability: VerticalViewability =
      getVerticalViewabilityInScroll(parentElement, childElement);
    switch (verticalViewability) {
      case "viewable":
        break;
      case "hiddenInTop":
        setChildElementTopInScroll(
          parentElement,
          childElement,
          headerElement.offsetHeight
        );
        break;

      case "hiddenInBottom":
        setChildElementBottomInScroll(
          parentElement,
          childElement,
          headerElement.offsetHeight - childElement.clientHeight
        );
        break;

      default:
        break;
    }
  }
}
function setChildElementTopInScroll(
  parentElement: HTMLElement,
  childElement: HTMLElement,
  offsetHeight = 0
): void {
  parentElement.scrollTop = childElement.offsetTop - offsetHeight;
}
function setChildElementBottomInScroll(
  parentElement: HTMLElement,
  childElement: HTMLElement,
  offsetHeight = 0
): void {
  parentElement.scrollTop =
    childElement.offsetTop - parentElement.clientHeight - offsetHeight;
}
