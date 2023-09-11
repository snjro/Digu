import type { AbiFragmentIdentifier, ConvertedEventLog } from "@db/dbTypes";
import { startDbWorker } from "@db/db.worker.portal";

export async function gridRows(
  eventIdentifier: AbiFragmentIdentifier,
): Promise<ConvertedEventLog[]> {
  const eventLogRows: ConvertedEventLog[] = await startDbWorker({
    targetFunctionName: "getConvertedEventLogs",
    params: eventIdentifier,
  });
  return eventLogRows;
}
