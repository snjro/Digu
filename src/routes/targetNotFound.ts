import { error } from "@sveltejs/kit";
import { TargetNotFoundError } from "@utils/utlisDb";

// Show the 404 page when a name in the URL is not in TARGET_CHAINS.
export function throwNotFoundAs404<T>(getData: () => T): T {
  try {
    return getData();
  } catch (e) {
    if (e instanceof TargetNotFoundError) {
      throw error(404, e.message);
    }
    throw e;
  }
}
