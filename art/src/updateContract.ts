import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { descriptorAbi } from "./abis/descriptor.js";
import { seederAbi } from "./abis/seeder.js";
import { getContract } from "viem";
import { imgData as gnarImg } from "./image-data.js";

type ImageDetail = {
  filename: string;
  data: string;
};

type Images = {
  bodies?: ImageDetail[];
  accessories?: ImageDetail[];
  glasses?: ImageDetail[];
  heads?: ImageDetail[];
  backgrounds?: ImageDetail[];
  palette?: string[];
};

type ImageData = {
  images: Images;
};

// Adjusted type to reflect that the properties will now hold arrays of strings.
type ConsolidatedData = {
  palette: string[];
  accessories: string[];
  bodies: string[];
  glasses: string[];
  heads: string[];
  backgrounds: string[];
};

if (!process.env.RPC_URL) {
  throw new Error("RPC URL required");
}
if (!process.env.PRIVATE_KEY) {
  throw new Error("private key required");
}

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

function formatImgData() {
  const imgData = gnarImg;

  const result: ConsolidatedData = {
    accessories: [],
    bodies: [],
    glasses: [],
    heads: [],
    backgrounds: [],
    palette: [],
  };

  for (const { images, palette } of imgData) {
    if (images.accessories) {
      result.accessories.push(...images.accessories.map((acc) => acc.data));
    }
    if (images.bodies) {
      result.bodies.push(...images.bodies.map((body) => body.data));
    }
    if (images.glasses) {
      result.glasses.push(...images.glasses.map((glass) => glass.data));
    }
    if (images.heads) {
      result.heads.push(...images.heads.map((head) => head.data));
    }
    if (images.backgrounds) {
      result.backgrounds.push(...images.backgrounds.map((bg) => bg.data));
    }
  }

  return result;
}

async function main() {
  const seeder = getContract({
    address: "0x3bc602D8760c6E36458f1f23640EA38366028c2D",
    abi: seederAbi,
    client: { public: publicClient, wallet: walletClient },
  });

  const descriptor = getContract({
    address: "0xF802B2E116DF429B40081ca095B5D8D33DEd0cb3",
    abi: descriptorAbi,
    client: { public: publicClient, wallet: walletClient },
  });

  const imgData = formatImgData();

  console.log("adding colors");
  const addManyColors = await descriptor.write.addManyColorsToPalette([
    0,
    imgData.palette,
  ]);
  console.log("tx hash: ", addManyColors);

  console.log("adding backgrounds");
  console.log(imgData.backgrounds);
  const addManyBackgrounds = await descriptor.write.addManyBackgrounds([
    imgData.backgrounds,
  ]);
  console.log("tx hash: ", addManyBackgrounds);

  // console.log("adding accessories");
  // const addManyAccessories = await descriptor.write.addManyAccessories([
  //   imgData.accessories as readonly `0x${string}`[],
  // ]);
  // console.log("tx hash: ", addManyAccessories);

  // console.log("adding bodies");
  // const addManyBodies = await descriptor.write.addManyBodies([
  //   imgData.bodies as readonly `0x${string}`[],
  // ]);
  // console.log("tx hash: ", addManyBodies);

  // console.log("adding heads");
  // const addManyHeads = await descriptor.write.addManyHeads([
  //   imgData.heads as readonly `0x${string}`[],
  // ]);
  // console.log("tx hash: ", addManyHeads);

  // console.log("adding glasses");
  // const addManyGlasses = await descriptor.write.addManyGlasses([
  //   imgData.glasses as readonly `0x${string}`[],
  // ]);
  // console.log("tx hash: ", addManyGlasses);
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
