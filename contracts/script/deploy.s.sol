// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/GnarSeeder.sol";
import "../src/GnarDescriptor.sol";

contract MyScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        GNARSeeder seeder = new GNARSeeder();
        GNARDescriptor descriptor = new GNARDescriptor();

        
        vm.stopBroadcast();
    }
}
