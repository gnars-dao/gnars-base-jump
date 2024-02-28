import Web3 from 'web3';
import { readFileSync, writeFileSync } from 'fs';
import 'dotenv/config';

const web3 = new Web3(process.env.PROVIDER_URL);
const snapshot = JSON.parse(readFileSync(process.env.SNAPSHOT_PATH, 'utf-8'));

/**
 * Read a "balance snapshot" and create a collection of holder addresses that are not EOAs
 * See "./input/balancesSnapshotExample.json" as an example of how the file should be formatted
 * Easily create a snapshot using https://holders.at/
 * Convert CSV to JSON using https://csvjson.com/csv2json
 */
async function getContractOwners() {
    const contracts = [];
    for (let i = 0; i < snapshot.length; i++) {
        const targetAddress = snapshot[i].address;
        const code = await web3.eth.getCode(targetAddress);
        if (code !== '0x') contracts.push(targetAddress);
    }

    writeFileSync('./output/contractOwners.json', JSON.stringify(contracts, undefined, 2));
}

getContractOwners().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});