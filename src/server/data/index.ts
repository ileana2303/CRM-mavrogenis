import type { DataProvider } from "./provider";
import { localProvider } from "./local/provider";
import { softOneProvider } from "./softone/provider";

/** Single entry point for services. Switch with DATA_PROVIDER=local|softone. */
export function db(): DataProvider {
  return process.env.DATA_PROVIDER === "softone" ? softOneProvider : localProvider;
}
