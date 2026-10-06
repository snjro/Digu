import { createEventLogsTableRequestHandler } from "./eventLogsTable.worker.handler";
import type { EventLogsTableWorkerMessage } from "./eventLogsTable.worker.types";

// Keeps the rows of one event logs table while the table is open.
const handleRequest = createEventLogsTableRequestHandler((result) => {
  postMessage(result);
});
self.addEventListener(
  "message",
  (event: MessageEvent<EventLogsTableWorkerMessage>): void => {
    handleRequest(event.data);
  },
);
