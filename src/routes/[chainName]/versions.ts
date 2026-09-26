import type { Contract, Project, Version } from "@constants/chains/types";
import type { trailingSlash } from "@routes/+layout";
import { getProjectVersionNameForUrl } from "$lib/common/projectVersionNameHelper";
import { getSubdirectoryHref } from "$lib/common/linkHref";
import { hasSyncTargetEvents } from "@utils/utilsEthers";

export function getVersionHref(
  pageUrlPathname: string,
  trailingSlashOption: typeof trailingSlash,
  projectName: Project["name"],
  versionName: Version["name"],
): string {
  return getSubdirectoryHref(
    pageUrlPathname,
    trailingSlashOption,
    getProjectVersionNameForUrl(projectName, versionName),
  );
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

// Unlike hasVersionEvents, leaves out anonymous events, which are not synced.
export function hasVersionSyncTargetEvents(targetVersion: Version): boolean {
  return targetVersion.contracts.some(hasSyncTargetEvents);
}
