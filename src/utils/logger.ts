// import consola from "consola";
import { consola } from "consola";
import { convertTimestampSecToIso8601 } from "./utilsTime";

export class myLogger {
  // eslint-disable-next-line
  static start(message: any, ...msgs: any[]) {
    consola.start(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
  }
  // eslint-disable-next-line
  static info(message: any, ...msgs: any[]) {
    consola.info(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
  }
  // eslint-disable-next-line
  static success(message: any, ...msgs: any[]) {
    consola.success(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
  }
  // eslint-disable-next-line
  static fail(message: any, ...msgs: any[]) {
    consola.fail(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
  }
  // eslint-disable-next-line
  static error(message: any, ...msgs: any[]) {
    consola.error(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
  }
  // eslint-disable-next-line
  static fatal(message: any, ...msgs: any[]) {
    consola.fatal(`${convertTimestampSecToIso8601()}\t`, message, ...msgs);
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
