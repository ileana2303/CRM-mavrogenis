import type { DataProvider } from "./provider";
import { softOneProvider } from "./softone/provider";

/** Single entry point for services. SoftOne is the only data source. */
export function db(): DataProvider {
  return softOneProvider;
}
