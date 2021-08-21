let dutchStaking = artifacts.require("dutchStaking");
let FetchToken = artifacts.require("FetchToken");

module.exports = function(deployer) {
  deployer.deploy(dutchStaking, "0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85");
};
