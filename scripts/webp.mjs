import sharp from "sharp";
import fs from "node:fs";
const dir = "public/exercises";
let n = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".png")) continue;
  const out = `${dir}/${f.replace(/\.png$/, ".webp")}`;
  await sharp(`${dir}/${f}`).resize(640, 640, { fit: "cover" }).webp({ quality: 82 }).toFile(out);
  n++;
}
console.log("converted", n);
