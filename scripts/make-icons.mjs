import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = join(root, "public", "crm-mavrogenis-logo-v1.png");
const iconsDir = join(root, "public", "icons");
const iconSizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

mkdirSync(iconsDir, { recursive: true });

async function transparentIcon(size, destination) {
  await sharp(source)
    .resize(size, size, { fit: "contain" })
    .png()
    .toFile(destination);
}

async function maskableIcon(size, destination) {
  const safeSize = Math.round(size * 0.78);
  const logo = await sharp(source)
    .resize(safeSize, safeSize, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(destination);
}

await Promise.all([
  ...iconSizes.map((size) =>
    transparentIcon(size, join(iconsDir, `icon-${size}.png`)),
  ),
  maskableIcon(192, join(iconsDir, "icon-192-maskable.png")),
  maskableIcon(512, join(iconsDir, "icon-512-maskable.png")),
  transparentIcon(180, join(iconsDir, "apple-touch-icon.png")),
  transparentIcon(180, join(root, "public", "apple-touch-icon.png")),
  transparentIcon(32, join(root, "public", "favicon.ico")),
  transparentIcon(450, join(root, "public", "mavrogenis.png")),
]);

console.log("CRM-Mavrogenis v1 icons written to", iconsDir);
