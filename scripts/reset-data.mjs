// Deletes ./data/*.json. The app re-seeds from the slides' demo data on the next request.
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "data");
if (existsSync(dir)) {
  for (const f of readdirSync(dir)) if (f.endsWith(".json") || f.endsWith(".tmp")) rmSync(join(dir, f));
  console.log("data/ cleared – demo data will be re-seeded on next request");
} else {
  console.log("data/ does not exist yet – nothing to do");
}
