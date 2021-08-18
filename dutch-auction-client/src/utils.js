// const Web3 = require('web3');
// //const HDWalletProvider = require('@truffle/hdwallet-provider');
// //provider = new HDWalletProvider("adult theme mistake auction apple outer math twenty across fiction upper boat", "https://ropsten.infura.io/v3/2408dd1a4d574ce889b35dd0a431e4ea");
// const walletAPIUrl = "https://ropsten.infura.io/v3/2408dd1a4d574ce889b35dd0a431e4ea";
// //provider = new HDWalletProvider("adult theme mistake auction apple outer math twenty across fiction upper boat", "https://ropsten.infura.io/v3/2408dd1a4d574ce889b35dd0a431e4ea", "https://ropsten.infura.io/"),
// const fs = require('fs');
// const path = require('path');
// const validateEnv = require('./envutils').validateEnv;
// const web3 = new Web3(new Web3.providers.HttpProvider(walletAPIUrl));
// //var provider = new Web3HDWalletProvider("adult theme mistake auction apple outer math twenty across fiction upper boat", web3);
// const account = validateEnv('CONTRACT_ACCOUNT');
// const address = validateEnv('CONTRACT_ADDRESS');
// const contractJSON = JSON.parse(fs.readFileSync(path.join(__dirname, './contract-abi/dutchStaking.json')));
// const contract = new provider.eth.Contract(contractJSON.abi, address, {from: account, gasLimit: 3000000});

// const Web3 = require('web3');
// const fs = require('fs');
// const path = require('path');
// const {BN} = require ("bn.js");
// const multiplier = new BN('1000000000000000000');
// const validateEnv = require('./envutils').validateEnv;
// const url = require('./json-rpc-provider').url;
// const web3 = new Web3(new Web3.providers.HttpProvider(url));
// const auctionOwner = validateEnv('CONTRACT_ACCOUNT');
// const auctionAddress = validateEnv('CONTRACT_ADDRESS');
// const contractJSON = JSON.parse(fs.readFileSync(path.join(__dirname, './contract-abi/dutchStaking.json')));
// const contract = new web3.eth.Contract(contractJSON.abi, auctionAddress, {from: auctionOwner, gasLimit: 3000000});
// // const address2 = validateEnv('SIMPLE_POOL_CONTRACT_ADDRESS');
// // const contractJSON2 = JSON.parse(fs.readFileSync(path.join(__dirname, './contract-abi/simpleStakePool.json')));
// // const poolContract = new web3.eth.Contract(contractJSON2.abi, address2, {from: account, gasLimit: 3000000});

// const tokenAddress = validateEnv('FET_CONTRACT_ADDRESS');
// const tokenOwner = validateEnv('FET_CONTRACT_ACCOUNT');
// const tokencontractJSON = JSON.parse(fs.readFileSync(path.join(__dirname, './contract-abi/ERC20TestToken.json')));
// const tokenContract = new web3.eth.Contract(tokencontractJSON.abi, tokenAddress, {from: tokenOwner, gasLimit: 3000000});

const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const fs = require('fs');
const path = require('path');
const validateEnv = require('./envutils').validateEnv;
const web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/9ba3a5911d8b49c8ad87920e5043eae3"));
const PRIVATE_KEY_AUCTION = '1ff499f2011d6a37e0420deffe3dc56a724e529bb96e77fdc2d82a30a9a8f606';
web3.eth.accounts.wallet.add(PRIVATE_KEY_AUCTION);
const account = validateEnv('CONTRACT_ACCOUNT');
//var key = new Buffer.from('1ff499f2011d6a37e0420deffe3dc56a724e529bb96e77fdc2d82a30a9a8f606', 'hex');
const address = validateEnv('CONTRACT_ADDRESS');
const contractJSON = JSON.parse(fs.readFileSync(path.join(__dirname, './contract-abi/dutchStaking.json')));
const contract = new web3.eth.Contract(contractJSON.abi, address, {from: account, gasLimit: 3000000});
const tokenAddress = validateEnv('FET_CONTRACT_ADDRESS');
const tokenOwner = validateEnv('FET_CONTRACT_ACCOUNT');
//const PRIVATE_KEY_FET = 'bb303caf08626cfc0ead52e69033df967259390e4205b24ce66c92edcaee6b19';
//web3.eth.accounts.wallet.add(PRIVATE_KEY_FET);
const tokencontractJSON = JSON.parse(fs.readFileSync(path.join(__dirname, './contract-abi/ERC20TestToken.json')));
const tokenContract = new web3.eth.Contract(tokencontractJSON.abi, tokenAddress, {from: tokenOwner, gasLimit: 3000000});

module.exports.getFinalStakers = async () => {
    try {
        let  result = await contract.methods.getFinalStakers().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed to fetch addresses"
            },
            data:{},
        }
    }
}

module.exports.getERC20Address = async () => {
    try {
        let result = await contract.methods.getERC20Address().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successfully fetched ERC20 contract address",
            },
            data: { 
                contractAddr: result,
            }
        }
    } catch (error) {
        return {
            status:{
                success: false,
                message: "Failed to fetch ERC20 contract address",
            },
            data: {}
        }
    }
}

module.exports.retrieveUndistributedAuctionRewards = async () => {
    try {
        let  result = await contract.methods.retrieveUndistributedAuctionRewards().send()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.bid = async (bidder_address, amount) => {
    try {
        if(bidder_address == null){
            bidder_address = tokenOwner
        }
        let result = await module.exports.approve(bidder_address, contract._address, amount)
        console.log(result)
        result = await contract.methods.bid(amount).send({from: bidder_address})
        console.log(result)

        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.finaliseAuction = async (finalPrice) => {
    try {
        let  result = await contract.methods.finaliseAuction(finalPrice).send()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.endLockup = async () => {
    try {
        let  result = await contract.methods.endLockup().send()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.abortAuction = async (payoutRewards) => {
    try {
        let  result = await contract.methods.abortAuction(payoutRewards).send()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.withdrawSelfStake = async () => {
    try {
        let  result = await contract.methods.withdrawSelfStake().send()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.withdrawPledgedStake = async () => {
    try {
        let  result = await contract.methods.withdrawPledgedStake().send()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.deleteContract = async () => {
    try {
        let  result = await contract.methods.deleteContract().send()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.getDenominator = async () => {
    try {
        let  result = await contract.methods.getDenominator().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.getFinalStakerSlots = async (staker) => {
    try {
        let  result = await contract.methods.getFinalStakerSlots(staker).call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.getFinalSlotsSold = async () => {
    try {
        let  result = await contract.methods.getFinalSlotsSold().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.isBiddingPhase = async () => {
    try {
        let  result = await contract.methods.isBiddingPhase().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.isFinalised = async () => {
    try {
        let  result = await contract.methods.isFinalised().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.getCurrentPrice = async () => {
    try {
        let  result = await contract.methods.getCurrentPrice().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.calculateSelfStakeNeeded = async (address) => {
    try {
        let  result = await contract.methods.calculateSelfStakeNeeded(address).call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.owner = async () => {
    try {
        let  result = await contract.methods.owner().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.earliestDelete = async () => {
    try {
        let  result = await contract.methods.earliestDelete().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.currentAID = async () => {
    try {
        let  result = await contract.methods.currentAID().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.totalAuctionRewards = async () => {
    try {
        let  result = await contract.methods.totalAuctionRewards().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.initialiseAuction = async (start, startStake, reserveStake, duration, lockup_duration, slotsOnSale, reward) => {
    try {
        // const BN = web3.utils.BN;
        // start = await web3.eth.getBlockNumber() + 1
        // startStake = startStake 
        // reserveStake =  reserveStake
        // let result = await module.exports.balanceOf(tokenOwner)
        // console.log("balanceOf", result)
        // result = await module.exports.allowance(tokenOwner, contract._address)
        // console.log("allowance", result)
        // // // result = await module.exports.approve(tokenOwner, contract.address, (new BN(reward).mul(multiplier)))
        // result = await module.exports.approve(tokenOwner, contract._address, reward)

        // console.log("approve", result)
        // result = await module.exports.allowance(tokenOwner, contract._address)
        // console.log("allowance", result)
        result = await contract.methods.initialiseAuction(start, startStake, reserveStake, duration, lockup_duration, slotsOnSale, reward).send({from: account})
        console.log("initialization", result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.approve = async (owner, spender, amount) => {
    try {
        let result = await tokenContract.methods.approve(spender, amount).send({from: owner})
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.allowance = async (owner, spender) => {
    try {
        let result = await tokenContract.methods.allowance(owner, spender).call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.balanceOf = async (account) => {
    try {
        let result = await tokenContract.methods.balanceOf(account).call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.transfer = async (_from, to, amount) => {
    try {
        let result = await tokenContract.methods.transfer(to, amount).send({from: _from})
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.mint = async (_from, to, amount) => {
    try {
        let result = await tokenContract.methods.mint(to, amount).send({from: _from})
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.getAuction = async () => {
    try {
        let result = await contract.methods.auction().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed"
            },
            data:{},
        }
    }
}

module.exports.getCurrentStakers = async () => {
    try {
        let  result = await contract.methods.getCurrentStakers().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed to fetch addresses"
            },
            data:{},
        }
    }
}

module.exports.getLastBidPrice = async () => {
    try {
        let  result = await contract.methods.getLastBidPrice().call()
        console.log(result)
        return {
            status:{
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status:{
                success: false,
                message: "Failed to fetch addresses"
            },
            data:{},
        }
    }
}