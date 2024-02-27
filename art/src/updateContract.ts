import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { descriptorAbi } from "./abis/descriptor.js";
import { seederAbi } from "./abis/seeder.js";
import { getContract } from "viem";
import { imgData } from "./image-data.js";

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
  //  imgData.images.accessories
  //  imgData.images.bodies
  //  imgData.images.glasses
  //  imgData.images.heads
  //  imgData.palette

  for (const { images, palette } of imgData) {
    console.log(images.accessories);
  }
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

  // const seeder = await writeContract(config, {
  //   seederAbi,
  //   address: "0x3bc602D8760c6E36458f1f23640EA38366028c2D",
  //   functionName: "transferFrom",
  //   args: [
  //     "0xd2135CfB216b74109775236E36d4b433F1DF507B",
  //     "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e",
  //     123n,
  //   ],
  // });

  formatImgData();
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
