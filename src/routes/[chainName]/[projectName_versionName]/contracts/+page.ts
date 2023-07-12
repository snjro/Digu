import type { LoadEvent } from "@sveltejs/kit";
import { _LoadVersionData, type LoadVersionData } from "../+page";

export function load({
  params,
}: {
  params: LoadEvent["params"];
}): LoadVersionData {
  return _LoadVersionData({ params });
}
