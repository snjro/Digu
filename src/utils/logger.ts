// import consola from "consola";
import { consola } from "consola";
import { convertTimestampSecToIso8601 } from "./utilsTime";

export class myLogger {
  // eslint-disable-next-line
  static info(message: any, ...msgs: any[]) {
    consola.info(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
  }
  // eslint-disable-next-line
  static error(message: any, ...msgs: any[]) {
    consola.error(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
  }
  // eslint-disable-next-line
  static warn(message: any, ...msgs: any[]) {
    consola.warn(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
  }
  // eslint-disable-next-line
  static debug(message: any, ...msgs: any[]) {
    consola.debug(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
  }
}
