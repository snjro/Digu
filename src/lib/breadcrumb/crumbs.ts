import {
  TAB_VALUES_CONTRACT,
  TAB_VALUES_EVENT,
  TAB_VALUES_FUNCTION,
} from "$lib/PageWrapper/tabs";
import type { BaseIconProps } from "$lib/base/BaseIcon";
import { getChainRootUrl } from "$lib/common/chainRootUrl";
import { getSplittedFunctionNameAndSelector } from "$lib/leftSidebar/Body/functionNameHandler";
import { convertToKebabCase } from "@utils/utilsCommon";
import {
  DIR_NAME_CONTRACTS,
  DIR_NAME_EVENTS,
  DIR_NAME_FUNCTIONS,
} from "@utils/utilsCostants";

export type CrumbItem = {
  href: string;
  text: string | undefined;
  prefixIconName: BaseIconProps["name"] | undefined;
};

function removeUrlHash(href: string): string {
  const hashStartIndex: number = href.indexOf("#");
  return hashStartIndex > 0 ? href.substring(0, hashStartIndex) : href;
}
function getPathNameWithUrlHash(
  previousPathName: string,
  currentPathName: string,
): string {
  let urlHash: string = "";
  // if (indexPathNames === pathNames.length - 1) {
  switch (previousPathName) {
    case DIR_NAME_CONTRACTS:
      urlHash = TAB_VALUES_CONTRACT[0];
      break;
    case DIR_NAME_EVENTS:
      urlHash = TAB_VALUES_EVENT[0];
      break;
    case DIR_NAME_FUNCTIONS:
      urlHash = TAB_VALUES_FUNCTION[0];
      break;
    default:
      urlHash = "";
      break;
  }
  if (urlHash) {
    urlHash = `#${convertToKebabCase(urlHash)}`;
  }
  // }
  return currentPathName + urlHash;
}
function convertUrlTextToLabelText(path: string): string {
  return path.replaceAll("-", " ");
}
export const getCrumbItems = (
  pathname: string,
  targetChainName: string,
  basePath: string,
  trailingSlash: "never" | "always" | "ignore",
): CrumbItem[] => {
  const crumbItems: CrumbItem[] = [];
  let href: CrumbItem["href"] = getChainRootUrl(basePath, targetChainName);
  let text: CrumbItem["text"] = undefined;
  let prefixIconName: CrumbItem["prefixIconName"] = "home";
  crumbItems.push({ href: href, text: text, prefixIconName: prefixIconName });

  // remove trailing slash
  const pathName: string =
    trailingSlash === "always" ? pathname.slice(0, -1) : pathname;

  const pathNames: string[] = pathName.split("/");

  const startIndex: number = pathNames.indexOf(targetChainName) + 1;
  for (
    let indexPathNames = startIndex;
    indexPathNames < pathNames.length;
    indexPathNames++
  ) {
    const previousPathName: string = pathNames[indexPathNames - 1];
    const currentPathName: string = pathNames[indexPathNames];
    const currentPathNameWithUrlHash = getPathNameWithUrlHash(
      previousPathName,
      currentPathName,
    );

    const currentPathNameWithoutFunctionSelector: string =
      previousPathName === DIR_NAME_FUNCTIONS
        ? getSplittedFunctionNameAndSelector(currentPathName).functionName
        : currentPathName;
    href = `${removeUrlHash(href)}/${currentPathNameWithUrlHash}`;
    text = convertUrlTextToLabelText(currentPathNameWithoutFunctionSelector);
    prefixIconName = undefined;
    if (text) {
      crumbItems.push({
        href: href,
        text: text,
        prefixIconName: prefixIconName,
      });
    }
  }
  return crumbItems;
};
