import type { Contract, Project, Version } from "@constants/chains/types";
import type { trailingSlash } from "@routes/+layout";
import { getProjectVersionNameForUrl } from "$lib/common/projectVersionNameHelper";

export function getVersionHref(
  pageUrlPathname: string,
  trailingSlashOption: typeof trailingSlash,
  projectName: Project["name"],
  versionName: Version["name"],
): string {
  const pathname: string =
    trailingSlashOption === "always"
      ? `${pageUrlPathname}`
      : `${pageUrlPathname}/`;

  return `${pathname}${getProjectVersionNameForUrl(projectName, versionName)}`;
}

export function numberOfEventsInVersion(targetVersion: Version): number {
  let numOfEvents: number = 0;
  targetVersion.contracts.forEach((targetContract: Contract) => {
    numOfEvents += targetContract.events.abiFragments.length;
  });
  return numOfEvents;
}

export function hasVersionEvents(targetVersion: Version): boolean {
  return numberOfEventsInVersion(targetVersion) > 0;
}
