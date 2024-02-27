import { PNGCollectionEncoder, type PngImage } from "@nouns/sdk";
import fs from "fs/promises";
import path from "path";
import { PNG } from "pngjs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DESTINATION = path.join(__dirname, "image-data.json");

/**
 * Read a PNG image file and return a `PngImage` object.
 * @param path The path to the PNG file
 */
const readPngImage = async (path: string) => {
  const buffer = await fs.readFile(path);
  const png = PNG.sync.read(buffer);

  return {
    width: png.width,
    height: png.height,
    rgbaAt: (x: number, y: number) => {
      const idx = (png.width * y + x) << 2;
      const [r, g, b, a] = [
        png.data[idx],
        png.data[idx + 1],
        png.data[idx + 2],
        png.data[idx + 3],
      ];
      return {
        r,
        g,
        b,
        a,
      };
    },
  };
};

const encode = async () => {
  const encoder = new PNGCollectionEncoder();

  const partfolders = [
    "0-backgrounds",
    "1-bodies",
    "2-accessories",
    "3-heads",
    "4-glasses",
  ];
  for (const folder of partfolders) {
    const folderpath = path.join(__dirname, "../images/Gnars", folder);
    const files = await fs.readdir(folderpath);
    for (const file of files) {
      const image = await readPngImage(path.join(folderpath, file));
      encoder.encodeImage(
        file.replace(/\.png$/, ""),
        image as PngImage,
        folder.replace(/^\d-/, "")
      );
    }
  }
  await fs.writeFile(
    DESTINATION,
    JSON.stringify(
      {
        ...encoder.data,
      },
      null,
      2
    )
  );
};

encode();
