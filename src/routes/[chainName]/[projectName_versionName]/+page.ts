import type { LoadEvent } from "@sveltejs/kit";
import type { ChainIdentifier, ProjectIdentifier } from "@db/dbTypes";
import type { Chain, Project, Version } from "@constants/chains/types";
import {
  getTargetChain,
  getTargetProject,
  getTargetVersion,
} from "@utils/utlisDb";
import { getSplitProjectVersionName } from "./projectVersionNameHelper";

export type LoadVersionData = {
  targetChain: Chain;
  targetProject: Project;
  targetVersion: Version;
};

export function load({
  params,
}: {
  params: LoadEvent["params"];
}): LoadVersionData {
  return _LoadVersionData({ params });
}

export function _LoadVersionData({
  params,
}: {
  params: LoadEvent["params"];
}): LoadVersionData {
  const chainIdentifier: ChainIdentifier = {
    chainName: params.chainName!,
  };
  const projectIdentifier: ProjectIdentifier = {
    ...chainIdentifier,
    projectName: getSplitProjectVersionName(params.projectName_versionName!)
      .projectName,
  };
  const versionIdentifier = {
    ...projectIdentifier,
    versionName: getSplitProjectVersionName(params.projectName_versionName!)
      .versionName,
  };

  const targetChain: Chain = getTargetChain(chainIdentifier);
  const targetProject: Project = getTargetProject(projectIdentifier);
  const targetVersion: Version = getTargetVersion(versionIdentifier);

  return {
    targetChain: targetChain,
    targetProject: targetProject,
    targetVersion: targetVersion,
  };
}
