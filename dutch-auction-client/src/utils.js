const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const fs = require('fs');
const path = require('path');

const {validateEnv} = require('./envutils');

// create intial web3 provider
const providerUrl = validateEnv('WEB3_PROVIDER_URL');
const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));

// load the service account from the service private key and all other service configuration variables
const serviceAccount = web3.eth.accounts.wallet.add(validateEnv('SERVICE_PRIVATE_KEY'));
const auctionAddress = validateEnv('AUCTION_CONTRACT_ADDRESS');
const tokenAddress = validateEnv('TOKEN_CONTRACT_ADDRESS');

// log some info out to keep the user informed
console.log(`Provider URL.............: ${providerUrl}`);
console.log(`Service Account Address..: ${serviceAccount.address}`);
console.log(`Auction Contract Address.: ${auctionAddress}`);
console.log(`Fetch Token Address......: ${tokenAddress}`);

// build up web3 components needed for the service
const auctionContractJSON = JSON.parse(fs.readFileSync(path.join(__dirname, './contract-abi/dutchStaking.json')));
const contract = new web3.eth.Contract(auctionContractJSON.abi, auctionAddress, {from: serviceAccount.address, gasLimit: 3000000});

const tokencontractJSON = JSON.parse(fs.readFileSync(path.join(__dirname, './contract-abi/FetchToken.json')));
const tokenContract = new web3.eth.Contract(tokencontractJSON, tokenAddress, {from: serviceAccount.address, gasLimit: 3000000});

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
        let  result = await contract.methods.finaliseAuction(finalPrice).send({gasLimit: 300000})
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
        let  result = await contract.methods.endLockup().send({gasLimit: 600000})
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
        console.log("abortAuction", payoutRewards);
        let  result = await contract.methods.abortAuction(payoutRewards).send({gasLimit: 600000})
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
        if (parseInt(reward) !== 0) {
            console.log("Non-zero reward is not supported");
            return
        }

        let result = await contract.methods.initialiseAuction(start, startStake, reserveStake, duration, lockup_duration,
            slotsOnSale, reward).send({gasLimit: 300000})

        console.log("initialization", result)
        return {
            status: {
                success: true,
                message: "Successful",
            },
            data: result
        }
    } catch (error) {
        console.log(error)
        return {
            status: {
                success: false,
                message: "Failed"
            },
            data: {},
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


// get total that staker has staked in the contract
module.exports.selfStakerDeposits = async (staker) => {
    try {
        let result = await contract.methods.selfStakerDeposits(staker).call()
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