const { FET_ERC20 } = require('../utility/constants');

let token = artifacts.require("CrowdsaleToken");
let mthlib = artifacts.require("SafeMathLib");

async function makeDeployment(deployer, network) {

	await deployer.deploy(mthlib);
	await deployer.link(mthlib, token);
	await deployer.deploy(token, FET_ERC20._name, FET_ERC20._symbol, FET_ERC20._initialSupply, FET_ERC20._decimals, FET_ERC20._mintable);
}

module.exports = (deployer, network) => {
    deployer.then(async () => {
        await makeDeployment(deployer, network);
    });
};
