# Gnars Base Jump Scripts

A collection of scripts used for various stages of the Gnars migration from Ethereum (L1) to Base (L2).

### Setup

#### Install dependencies
```shell
npm install
```

#### Set environment variables
Make a copy of `.env.sample` called `.env` and fill it in with appropriate values.

### Run

#### Get Contract Holders
This script is used to get a snapshot of non-EOA holders. It was important to Gnars to ensure minimal tokens were held by contracts before the snapshot to avoid stranding them on Base.
```shell
npm run getContractHolders
```

#### Snapshot Holders
```shell
npm run snapshotHolders -- 19325750
```
Note: You can change `19325750` to any block number, but this is the block [chosen by Gnars DAO for this specific migration](https://discord.com/channels/928811922244137020/929970602087952394/1211797897234874388).

#### Create Merkle Minter Tree
```shell
npm run createMerkleMinterTree
```