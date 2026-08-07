import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");
const wordmark = await readFile(path.join(root, "src", "assets", "logo-dark.svg"));

async function brandedPng(size) {
  const horizontalPadding = Math.max(2, Math.round(size * 0.055));
  const logo = await sharp(wordmark)
    .resize({ width: size - horizontalPadding * 2, fit: "inside" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 13, g: 13, b: 13, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toBuffer();
}

function pngIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header[entry + 2] = 0;
    header[entry + 3] = 0;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

const png16 = await brandedPng(16);
const png32 = await brandedPng(32);
const png180 = await brandedPng(180);
const png512 = await brandedPng(512);

await Promise.all([
  writeFile(path.join(publicDir, "favicon-32.png"), png32),
  writeFile(path.join(publicDir, "favicon.png"), png512),
  writeFile(path.join(publicDir, "apple-touch-icon.png"), png180),
  writeFile(
    path.join(publicDir, "favicon.ico"),
    pngIco([
      { size: 16, data: png16 },
      { size: 32, data: png32 },
    ]),
  ),
]);

console.log("Generated PrizeSkout wordmark favicons.");
