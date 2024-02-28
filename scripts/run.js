import Web3 from 'web3';
import { readFileSync, writeFileSync } from 'fs';
import { createTree } from 'lanyard';
import 'dotenv/config';

const web3 = new Web3(process.env.PROVIDER_URL);
const snapshot = JSON.parse(readFileSync(process.env.SNAPSHOT_PATH, 'utf-8'));

async function main(args) {
  const scriptName = args[0];

  switch (scriptName) {
    case 'createMerkleMinterTree':
      await createMerkleMinterTree(args);
      break;
    case 'getContractHolders':
      await getContractHolders(args);
      break;
    case 'snapshotHolders':
      await snapshotHolders(args);
      break;
    default:
      console.log(`Not matching script named "${scriptName}".`);
  }
}

/**
 * Create a merkle tree to be used by the "MerkleReserveMinter".
 * MerkleReserveMinter: https://basescan.org/address/0x7D8Ea0D056f5B8443cdD8495D4e90FFCf0a8A354#writeContract
 * See "./input/holdersSnapshotExample.json" as an example of how the file should be formatted.
 * Holders snapshot can be created using "snapshotHolders" script.
 * Adapted from https://github.com/ourzora/nouns-builder/blob/e230be88e5268bc250d90405c7678f7314a5fbe3/apps/web/src/modules/create-proposal/utils/prepareMemberMerkleRoot.ts
 */
async function createMerkleMinterTree(args) {
  console.log('Running createMerkleMinterTree...');

  const leaves = snapshot.map((holder, index) => (
    holder !== null ? web3.eth.abi.encodeParameters(['address', 'uint256'], [holder, index]) : undefined
  )).filter((leaf) => Boolean(leaf));

  const merkleRoot = await createTree({
    unhashedLeaves: leaves,
  }).then((x) => `0x${x.merkleRoot}`);

  console.log(`Merkle root: ${merkleRoot}`);
}

/**
 * Read a "balance snapshot" and create a collection of holder addresses that are not EOAs.
 * See "./input/balancesSnapshotExample.json" as an example of how the file should be formatted.
 * Easily create a snapshot using https://holders.at/
 * Convert CSV to JSON using https://csvjson.com/csv2json
 */
async function getContractHolders(args) {
  console.log('Running getContractOwners...');

  const contracts = [];
  for (let i = 0; i < snapshot.length; i++) {
    const targetAddress = snapshot[i].address;
    const code = await web3.eth.getCode(targetAddress);
    if (code !== '0x') contracts.push(targetAddress);
  }

  const outputFileName = './output/contractOwners.json';
  writeFileSync(outputFileName, JSON.stringify(contracts, undefined, 2));

  console.log(`Results written to "${outputFileName}".`);
}

/**
 * Create a snapshot of holders at a specified block.
 */
async function snapshotHolders(args) {
  if (args.length !== 2) {
    console.log(`Missing block number. Try running like "npm run snapshotHolders -- {blockNumber}"`);
    return;
  }

  const blockNumber = parseInt(args[1], 10);

  console.log(`Taking Gnars holder snapshot at block ${blockNumber}...`)

  // https://etherscan.io/address/0x558bfff0d583416f7c4e380625c7865821b8e95c
  const gnars = new web3.eth.Contract(
    JSON.parse(readFileSync('./abis/SkateContractV2.json', 'utf-8')),
    '0x558BFFF0D583416f7C4e380625c7865821b8E95C',
  );

  const totalSupply = Number(await gnars.methods.totalSupply().call(null, blockNumber));
  const percentDividend = Math.floor(totalSupply / 100);

  const holders = [];
  for (let i = 0; i < totalSupply; i++) {
    try {
      holders.push(await gnars.methods.ownerOf(i).call(null, blockNumber));
    } catch(e) {
      holders.push(null);
    }

    if (i > 0 && i % percentDividend === 0) {
      console.log(`${i / percentDividend}% complete.`);
    }
  }

  const outputFileName = `./output/holders_${blockNumber}.json`;
  writeFileSync(outputFileName, JSON.stringify(holders, undefined, 2));

  console.log(`Results written to "${outputFileName}".`);
}

// https://nodejs.org/docs/latest/api/process.html#process_process_argv
main(process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
