let dutchStaking = artifacts.require("dutchStaking");
let ERC20Token = artifacts.require("CrowdsaleToken");

module.exports = function(deployer) {
  deployer.deploy(dutchStaking, ERC20Token.address);
};
