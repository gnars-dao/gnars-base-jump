export const seederAbi = [
  {
    type: "function",
    name: "generateSeed",
    inputs: [
      {
        name: "gnarId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "descriptor",
        type: "address",
        internalType: "contract IGnarDescriptor",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct IGnarSeeder.Seed",
        components: [
          {
            name: "background",
            type: "uint48",
            internalType: "uint48",
          },
          {
            name: "body",
            type: "uint48",
            internalType: "uint48",
          },
          {
            name: "accessory",
            type: "uint48",
            internalType: "uint48",
          },
          {
            name: "head",
            type: "uint48",
            internalType: "uint48",
          },
          {
            name: "glasses",
            type: "uint48",
            internalType: "uint48",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;
