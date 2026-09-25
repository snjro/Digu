import type { AbiFragmentIdentifier, ConvertedEventLog } from "@db/dbTypes";
import { startDbWorker } from "@db/db.worker.portal";
import { customLogger } from "@utils/logger";

export async function gridRows(
  eventIdentifier: AbiFragmentIdentifier,
): Promise<ConvertedEventLog[]> {
  try {
    const eventLogRows: ConvertedEventLog[] = await startDbWorker({
      targetFunctionName: "getConvertedEventLogs",
      params: eventIdentifier,
    });
    return eventLogRows;
  } catch (error) {
    // Show no rows instead of loading forever.
    customLogger.error("Get event logs.", {
      eventIdentifier: eventIdentifier,
      errorObject: error,
    });
    return [];
  }
}
