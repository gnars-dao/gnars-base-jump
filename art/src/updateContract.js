const { http, createConfig } = require("@wagmi/core");
const { baseSepolia } = require("@wagmi/core/chains");
const { getAccount, getEnsName } = require("@wagmi/core");

const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [baseSepolia.id]: http(
      "https://base-sepolia.g.alchemy.com/v2/W9cCYEsnJuYu55k534C7LTKcqWr7utiZ"
    ),
  },
});

async function main() {
  const { address } = getAccount(config);
  const ensName = await getEnsName(config, { address });
  console.log({ ensName });
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
