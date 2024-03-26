import Web3 from 'web3';
import { readFileSync, writeFileSync } from 'fs';
import { createTree, getProof } from 'lanyard';
import { Defender } from '@openzeppelin/defender-sdk';
import _ from 'lodash';
import 'dotenv/config';

const debugEnabled = process.env.DEBUG_ENABLED === 'true';
const dryRunEnabled = process.env.DRY_RUN_ENABLED === 'true';

const web3 = new Web3(process.env.PROVIDER_URL);
const relayer = new Defender({
  relayerApiKey: process.env.OPENZEPPELIN_RELAYER_API_KEY,
  relayerApiSecret: process.env.OPENZEPPELIN_RELAYER_SECRET_KEY
});
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
    case 'airdropTokens':
      await airdropTokens(args);
      break;
    default:
      console.log(`Not matching script named "${scriptName}".`);
  }
}

/**
 * Create a merkle tree to be used by the "MerkleReserveMinter".
 * MerkleReserveMinter: https://basescan.org/address/0x7D8Ea0D056f5B8443cdD8495D4e90FFCf0a8A354#writeContract
 * See "./data/holdersSnapshotExample.json" as an example of how the file should be formatted.
 * Holders snapshot can be created using "snapshotHolders" script.
 * Adapted from https://github.com/ourzora/nouns-builder/blob/e230be88e5268bc250d90405c7678f7314a5fbe3/apps/web/src/modules/create-proposal/utils/prepareMemberMerkleRoot.ts
 */
async function createMerkleMinterTree(args) {
  console.log('Running createMerkleMinterTree...');

  function isOG(tokenId) {
    return tokenId <= parseInt(process.env.MAX_OG_GNAR_TOKEN_ID, 10);
  }

  const unhashedLeaves = snapshot.map((holder, index) => (
    holder !== null || isOG(index)
      ? web3.eth.abi.encodeParameters(
          ['address', 'uint256'],
          [isOG(index) ? process.env.GNARS_TREASURY_ADDRESS : holder, index]
        )
      : undefined
  )).filter((leaf) => Boolean(leaf));

  const merkleRoot = await createTree({ unhashedLeaves }).then((x) => x.merkleRoot);

  console.log(`Merkle root: ${merkleRoot}`);

  return { merkleRoot, unhashedLeaves };
}

/**
 * Airdrop tokens with "MerkleReserveMinter" contract using merkle tree data.
 * If the script fails midway through, you can set `START_CHUNK` envar to pick up
 * where it left off. There's no risk of accidentally airdropping the same token twice.
 */
async function airdropTokens(args) {
  console.log('Airdropping tokens...');

  const merkleTreeData = await createMerkleMinterTree(args);
  const unhashedLeavesChunks = _.chunk(merkleTreeData.unhashedLeaves, parseInt(process.env.AIRDROP_CHUNK_SIZE, 10));

  const merkleReserveMinter = new web3.eth.Contract(
    JSON.parse(readFileSync(process.env.MERKLE_RESERVE_MINTER_ABI_PATH, 'utf-8')),
    process.env.MERKLE_RESERVE_MINTER_ADDRESS,
  );

  for (let chunk = 0; chunk < unhashedLeavesChunks.length; chunk += 1) {
    if (chunk + 1 >= parseInt(process.env.START_CHUNK, 10)) {

      process.stdout.write(`Processing chunk ${chunk + 1}/${unhashedLeavesChunks.length}...`);

      const proofs = await Promise.all(unhashedLeavesChunks[chunk].map((unhashedLeaf) => getProof({
        merkleRoot: merkleTreeData.merkleRoot,
        unhashedLeaf
      })));

      const data = merkleReserveMinter.methods.mintFromReserve(
        process.env.GNARS_TOKEN_ADDRESS,
        proofs.map((proof) => {
          const decodedParams = web3.eth.abi.decodeParameters(['address', 'uint256'], proof.unhashedLeaf);
          return [decodedParams[0], decodedParams[1], proof.proof]
        })
      ).encodeABI();

      if (debugEnabled) console.log(data);

      let tx;
      if (!dryRunEnabled) {
        tx = await relayer.relaySigner.sendTransaction({
          to: process.env.MERKLE_RESERVE_MINTER_ADDRESS,
          data,
          gasLimit: 8000000,
        });


        /**
         * Because of the speed of Base, the relayer tends to get a bit ahead of itself and
         * occasionally fails because the account balance is out of sync with the network.
         * Adding this timeout and check for pending transactions makes this script a bit more
         * reliable.
         */
        const RELAYER_TIMEOUT = 5000;
        let relayerStatus = await relayer.relaySigner.getRelayerStatus();
        while (relayerStatus .numberOfPendingTransactions > 0) {
          await new Promise(resolve => setTimeout(resolve, RELAYER_TIMEOUT));
          relayerStatus = await relayer.relaySigner.getRelayerStatus();
          console.log(`Pending transactions: ${relayerStatus.numberOfPendingTransactions}`);
          console.log(`Pending tx cost: ${relayerStatus.pendingTxCost}`);
        }
      }

      process.stdout.write('complete\n');

      if (debugEnabled) console.log(tx ? tx : 'Transaction was not sent because this was a dry run.');
    } else {
      console.log(`Skipped chunk ${chunk + 1}`);
    }
  }
}

/**
 * Read a "balance snapshot" and create a collection of holder addresses that are not EOAs.
 * See "./data/balancesSnapshotExample.json" as an example of how the file should be formatted.
 * Easily create a snapshot using https://holders.at/
 * Convert CSV to JSON using https://csvjson.com/csv2json
 */
async function getContractHolders(args) {
  console.log('Running getContractHolders...');

  const contracts = [];
  for (let i = 0; i < snapshot.length; i++) {
    const targetAddress = snapshot[i].address;
    const code = await web3.eth.getCode(targetAddress);
    if (code !== '0x') contracts.push(targetAddress);
  }

  const outputFileName = './data/contractHolders.json';
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

  const gnars = new web3.eth.Contract(
    JSON.parse(readFileSync(process.env.SNAPSHOT_TARGET_ABI_PATH, 'utf-8')),
    process.env.SNAPSHOT_TARGET_ADDRESS,
  );

  const totalSupply = process.env.MAX_TOKEN_ID ?
    parseInt(process.env.MAX_TOKEN_ID, 10) :
    Number(await gnars.methods.totalSupply().call(null, blockNumber));
  const percentDividend = Math.floor(totalSupply / 100);

  const holders = [];
  for (let i = 0; i <= totalSupply; i++) {
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
