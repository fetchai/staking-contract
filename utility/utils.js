const { BN, time } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const { FET_ERC20, AuctionConstants } = require("./constants.js")
const ERC20Token = artifacts.require("ERC20TestToken");

// Deploys token, releases it and adds a balance to all accounts
exports.deployToken = async function(Auction, accounts, initialBalance) {
    let token = await ERC20Token.new(FET_ERC20._name, FET_ERC20._symbol, FET_ERC20._initialSupply);
    ////console.log("Token Address", token.address)
    //await token.setReleaseAgent(Auction._owner);
    ////console.log("Auction Owner", Auction._owner)
    //await token.releaseTokenTransfer()

    for (i=0; i < accounts.length; i++) {
        await token.transfer(accounts[i], initialBalance)
    }
    return token
};

// Initialises an auction
exports.initialiseAuction = async function(auctionSpec, token, instance, options={}) {
    let allowance = await token.allowance(auctionSpec._owner, instance.address)
    await token.approve(instance.address, allowance.add(auctionSpec._totalStakingRewards))
    

    if (options.start) {
        auctionSpec._auctionStart = options.start
    } else {
        auctionSpec._auctionStart = await web3.eth.getBlockNumber() + 1
    }
    auctionSpec._auctionEnd = auctionSpec._auctionStart + auctionSpec._duration + AuctionConstants._reserve_price_duration
    auctionSpec._lockupEnd = auctionSpec._auctionEnd + auctionSpec._lockup_duration
    await instance.initialiseAuction(auctionSpec._auctionStart, auctionSpec._startStake, auctionSpec._reserveStake, auctionSpec._duration, auctionSpec._lockup_duration, auctionSpec._slotsOnSale, auctionSpec._totalStakingRewards)
    return instance
};

// Approves transfer to the auction for all accounts
exports.approveAll = async function(auctionSpec, token, instance, accounts, amount) {
    let amountUsed = amount || auctionSpec._startStake.mul(new BN('10'))
    for (i=0; i < accounts.length; i++) {
        await token.approve(instance.address, amountUsed, {from: accounts[i]})
    }
};

// Only returns the value of the first matching event
exports.filterEventValue = function(txReceipt, eventName, valueName){
    return txReceipt.logs.filter(l => l.event == eventName)[0].args[valueName]
};

// Adds N bids, from accounts[0:N]
exports.addNBids = async function(instance, auctionSpec, accounts,  options={}){
    let N = options.N || accounts.length
    let amounts = options.amounts || new Array(N).fill(new BN('0') )
    assert.equal(amounts.length, N)

    let enteredBids = [], receipts = [], currentPrice = await instance.getCurrentPrice.call()

    for (i = 0; i < N; i++){
        let nextAmount = amounts[i]
        assert.ok(nextAmount.isZero() || nextAmount.gte(auctionSpec._reserveStake), `${nextAmount.toString()}`)

        while ((nextAmount.isZero() == false) && currentPrice.gt(nextAmount)){
            await time.advanceBlock()
            currentPrice = await instance.getCurrentPrice.call()
        }
        let receipt = await instance.bid(amounts[i], {from: accounts[i]})
        receipts.push(receipt)
        let amount = exports.filterEventValue(receipt, 'Bid', 'amount')
        let priceAtBid = exports.filterEventValue(receipt, 'Bid', 'currentPrice')
        enteredBids.push({amount: amount, priceAtBid: priceAtBid})
    }
    return [enteredBids, receipts]
};

exports.calcExpPledgingReward = function(Pool, pledgedAmount){
    return Pool.rewardPerTok.mul(pledgedAmount).div(AuctionConstants._reward_per_tok_denominator)
};

// Advance to targetBlock
exports.advanceToBlock = async function(targetBlock){
    let currentBlockNumber = await web3.eth.getBlockNumber()
    while (currentBlockNumber < targetBlock) {
        await time.advanceBlock ()
        currentBlockNumber += 1
    }
}

// Advance to price
exports.advanceToPrice = async function(instance, targetPrice, reserveStake){
    assert.ok(targetPrice.gte(reserveStake))
    let currentPrice = await instance.getCurrentPrice.call()
    while ( currentPrice.gt(targetPrice) ) {
        await time.advanceBlock ()
        currentPrice = await instance.getCurrentPrice.call()
    }
    return currentPrice
}

exports.advanceAndEndLockup = async function(auctionSpec, instance){
    await exports.advanceToBlock(auctionSpec._auctionEnd + auctionSpec._lockup_duration + 1)
    await instance.endLockup()
};

exports.getTokenBalances = async function(token, instance, addresses, poolAddresses=[]){
    let accountBalances = [], poolBalances = []
    for (i=0; i<addresses.length; i++){
        let balance = await token.balanceOf(addresses[i])
        accountBalances.push(balance.toString())
    }

    for (i=0; i<poolAddresses.length; i++){
        let balance = await token.balanceOf(poolAddresses[i])
        poolBalances.push(balance.toString())
    }

    let tokenBalance = await token.balanceOf(instance.address)
    return [tokenBalance.toString(), accountBalances, poolBalances]
}

function allocateSlots(amount, priceAtBid, slotsRemaining, finalPrice, maxNextPrice){
    let slotsWon = 0

    if (finalPrice.lte(priceAtBid)){
        slotsWon = Math.min( amount.div(finalPrice).toNumber(), slotsRemaining)
    }

    let nextPrice = amount.div( new BN( (slotsWon + 1).toString() ) )
    if (priceAtBid.lt(nextPrice)){
        nextPrice = priceAtBid
    }
    if (nextPrice.gt(maxNextPrice)){
        maxNextPrice = nextPrice
    }
    return [maxNextPrice, slotsRemaining - slotsWon]
}

exports.calcTrueFinalPrice = function(auctionSpec, enteredBids, lowestPrice){
    lowestPrice = lowestPrice || auctionSpec._reserveStake

    function sumOfAmounts(sum, entry){
        return sum.add(entry.amount)
    }

    const totalAmount = enteredBids.reduce(sumOfAmounts, new BN('0') )
    const highestSellOutPrice = totalAmount.divRound( new BN(auctionSpec._slotsOnSale.toString() ) )

    let finalPrice = highestSellOutPrice.gte(auctionSpec._reserveStake) ? highestSellOutPrice : auctionSpec._reserveStake

    while (true){
        var slotsRemaining = auctionSpec._slotsOnSale
        var maxNextPrice = new BN('0')

        for (i=0; i< enteredBids.length; i++){
            let bid = enteredBids[i]
            let out = allocateSlots(bid.amount, bid.priceAtBid, slotsRemaining, finalPrice, maxNextPrice)
            maxNextPrice = out[0]; slotsRemaining = out[1]
        }

        if (slotsRemaining == 0){
            break
        } else if (maxNextPrice.lt(auctionSpec._reserveStake)){
            finalPrice = auctionSpec._reserveStake
            break
        }
        finalPrice = maxNextPrice
    }
    assert.ok(finalPrice.gte(auctionSpec._reserveStake), "Calculated final price below reserve stake")
    return finalPrice
}

exports.advanceAndFinaliseAuction = async function(auctionSpec, instance, options={}){
    let finalPrice = options.finalPrice || exports.calcTrueFinalPrice(auctionSpec, options.enteredBids, auctionSpec._reserveStake)
    await exports.advanceToBlock(auctionSpec._auctionEnd)
    let receipt = await instance.finaliseAuction(finalPrice)
    assert.ok(await instance.isFinalised.call())
    return {receipt: receipt, finalPrice: finalPrice}
};

// Truffle only includes events from contract called directly (i.e. pool). Need to parse auction events
exports.getEnteredBidsFromEvents = async function(instance, fromBlock=0, AID=undefined){
    let contract = new web3.eth.Contract(instance.abi, instance.address)
    let bidEvents = await contract.getPastEvents("Bid", {fromBlock: fromBlock, toBlock: "latest"})
    let enteredBids = bidEvents.map(event => ({amount: new BN(event.returnValues.amount),
                                               priceAtBid: new BN(event.returnValues.currentPrice),
                                               AID: event.returnValues.AID}))
    if (AID){
        enteredBids = enteredBids.filter(bid => bid.AID == AID.toString())
    }
    return enteredBids
};

exports.calc_rewardPerTok = function(poolSpec){
        return poolSpec._totalReward.mul(AuctionConstants._reward_per_tok_denominator).div(poolSpec._maxStake)
};

exports.registerWalletPool = async function(token, instance, poolSpec, AID) {
    // requires the rewards to be approved
    expect(await token.allowance.call(poolSpec._owner, instance.address)).to.be.bignumber.gte(poolSpec._totalReward)
    await instance.registerPool(AID, poolSpec._totalReward, poolSpec.rewardPerTok, {from: poolSpec._owner})
};
