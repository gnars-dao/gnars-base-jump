const { PNGCollectionEncoder } = require("@nouns/sdk");
const fs = require("fs").promises;
const path = require("path");
const { PNG } = require("pngjs");

const DESTINATION = path.join(__dirname, "image-data.json");

/**
 * Read a PNG image file and return a `PngImage` object.
 * @param path The path to the PNG file
 */
const readPngImage = async (path) => {
  const buffer = await fs.readFile(path);
  const png = PNG.sync.read(buffer);

  return {
    width: png.width,
    height: png.height,
    rgbaAt: (x, y) => {
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

  const partfolders = ["1-bodies", "2-accessories", "3-heads", "4-glasses"];
  for (const folder of partfolders) {
    const folderpath = path.join(__dirname, "../images/Gnars", folder);
    const files = await fs.readdir(folderpath);
    for (const file of files) {
      const image = await readPngImage(path.join(folderpath, file));
      encoder.encodeImage(
        file.replace(/\.png$/, ""),
        image,
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
