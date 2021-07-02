const { BN, constants, expectEvent, expectRevert, time } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const dutchStaking = artifacts.require("dutchStaking");
const simpleStakePool = artifacts.require("simpleStakePool");

const { deployToken, initialiseAuction, approveAll, advanceToBlock, advanceAndEndLockup, advanceToPrice,
        calcExpPledgingReward, getTokenBalances, advanceAndFinaliseAuction, filterEventValue, getEnteredBidsFromEvents,
        registerWalletPool, calc_rewardPerTok } = require('../utility/utils');
const { AuctionConstants, FET_ERC20 } = require("../utility/constants.js")

contract("dutchStaking - pool staking", async accounts => {
    let instance, token, pool
    // ERC20 balance given to every account when deploying the token
    let initialBalance = new BN('100000').mul(FET_ERC20.multiplier)

    let auctionSpec = {
        _AID : 1,
        _startStake : new BN('50000').mul(FET_ERC20.multiplier),
        _reserveStake : new BN('100').mul(FET_ERC20.multiplier),
        _duration : 50,
        _lockup_duration: 25,
        _slotsOnSale : 8,
        _auctionStart : 0,  // adjusted within initialiseAuction
        _auctionEnd : 0,    // adjusted within initialiseAuction
        _lockupEnd : 0,     // adjusted within initialiseAuction
        _totalStakingRewards : new BN('1000').mul(FET_ERC20.multiplier),
        _owner : accounts[0]  // truffle default
    }
    auctionSpec._rewardPerSlot = auctionSpec._totalStakingRewards.div( new BN(auctionSpec._slotsOnSale.toString()) )

    let poolSpec = {
        _maxStake : new BN('20000').mul(FET_ERC20.multiplier),
        _totalReward : new BN('500').mul(FET_ERC20.multiplier),
        _owner : accounts[1]
    }
    poolSpec.rewardPerTok = calc_rewardPerTok(poolSpec)

    const registerPoolWithReward = async function(poolInstance, poolSpec, AID) {
        await token.transfer(poolInstance.address, poolSpec._totalReward, {from: poolSpec._owner})
        await poolInstance.registerPool(AID, poolSpec._maxStake, poolSpec._totalReward, poolSpec.rewardPerTok, {from: poolSpec._owner})
    };

    const deployAndregisterPoolWithReward = async function(poolSpec, AID) {
        newPool = await simpleStakePool.new(token.address, instance.address, {from: poolSpec._owner})
        await token.transfer(newPool.address, poolSpec._totalReward, {from: poolSpec._owner})
        await newPool.registerPool(AID, poolSpec._maxStake, poolSpec._totalReward, poolSpec.rewardPerTok, {from: poolSpec._owner})
        return newPool
    };

    const getDeposits = async function(addresses, poolAddresses){
        let selfStakerDeposits = [], pledges = []
        for (i=0; i<addresses.length; i++){
            let selfStakerDeposit = await instance.selfStakerDeposits.call(addresses[i])
            let stakerDeposit = await instance.pledges__amount.call(addresses[i])
            selfStakerDeposits.push(selfStakerDeposit.toString());
            pledges.push(stakerDeposit.toString());
        }

        let poolSelfStakerDeposits = [], poolDeposits = []
        for (i=0; i<poolAddresses.length; i++){
            let poolSelfStakerDeposit = await instance.selfStakerDeposits.call(poolAddresses[i])
            let poolDeposit = await instance.poolDeposits.call(poolAddresses[i])
            poolSelfStakerDeposits.push(poolSelfStakerDeposit.toString());
            poolDeposits.push(poolDeposit.toString());
        }

        return [selfStakerDeposits, pledges, poolSelfStakerDeposits, poolDeposits]
    };

    const addPledges = async function(auctionSpec, addresses, poolAddress, amount){
        await approveAll(auctionSpec, token, instance, addresses, amount);
        for (i = 0; i < addresses.length; i++){
            await instance.pledgeStake(auctionSpec._AID, poolAddress, amount, {from: addresses[i]})
        }
    };

    before(async () => {
        token = await deployToken(auctionSpec, accounts, initialBalance);
    });

    describe("Initialise a pool", function() {
        beforeEach(async () => {
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
        });

        it("should fail to initialise a pool without an auction", async () => {
            instance = await dutchStaking.new(token.address)
            pool = await simpleStakePool.new(token.address, instance.address, {from: poolSpec._owner})
            await token.transfer(pool.address, poolSpec._totalReward, {from: poolSpec._owner})
            let AID = 0
            await expectRevert.unspecified(pool.registerPool(AID, poolSpec._maxStake, poolSpec._totalReward, poolSpec.rewardPerTok))
        });
        it("should register a pool for an active auction and fail for another AID", async () => {
            await initialiseAuction(auctionSpec, token, instance);
            pool = await simpleStakePool.new(token.address, instance.address, {from: poolSpec._owner})

            await token.transfer(pool.address, poolSpec._totalReward, {from: poolSpec._owner})
            await pool.registerPool(auctionSpec._AID, poolSpec._maxStake, poolSpec._totalReward, poolSpec.rewardPerTok, {from: poolSpec._owner})

            await expectRevert.unspecified(pool.registerPool(auctionSpec._AID + 1, poolSpec._maxStake, poolSpec._totalReward, poolSpec.rewardPerTok, {from: poolSpec._owner}))

            expect(await instance.registeredPools__remainingReward(pool.address)).to.be.bignumber.equal(poolSpec._totalReward)
            expect(await instance.registeredPools__rewardPerTok(pool.address)).to.be.bignumber.equal(poolSpec.rewardPerTok)
            expect(await instance.registeredPools__AID(pool.address)).to.be.bignumber.equal( auctionSpec._AID.toString() )
        });
        it("should fail to initialise more than one pool from the same pool-contract for the same auction", async () => {
            await initialiseAuction(auctionSpec, token, instance);
            pool = await deployAndregisterPoolWithReward(poolSpec, auctionSpec._AID)

            await expectRevert.unspecified(pool.registerPool(auctionSpec._AID, poolSpec._maxStake, poolSpec._totalReward, poolSpec.rewardPerTok))
        });
        it("should commit the pool's totalReward to the auction contract and record it in poolDeposits", async () => {
            await initialiseAuction(auctionSpec, token, instance);
            pool = await simpleStakePool.new(token.address, instance.address, {from: poolSpec._owner})
            await token.transfer(pool.address, poolSpec._totalReward)

            let balancePre = await token.balanceOf(pool.address)
            await pool.registerPool(auctionSpec._AID, poolSpec._maxStake, poolSpec._totalReward, poolSpec.rewardPerTok, {from: poolSpec._owner})
            let balancePost = await token.balanceOf(pool.address)

            expect(balancePre.sub(balancePost)).to.be.bignumber.equal(poolSpec._totalReward)
            expect(await instance.poolDeposits.call(pool.address)).to.be.bignumber.equal(poolSpec._totalReward)
        });
        it("should increase the poolDeposits by totalRewards and not allow the pool to withdraw them", async () => {
            await initialiseAuction(auctionSpec, token, instance, dutchStaking);
            pool = await deployAndregisterPoolWithReward(poolSpec, auctionSpec._AID)

            expect(await token.balanceOf(pool.address)).to.be.bignumber.equal('0')
            await pool.withdrawSelfStake({from: poolSpec._owner})
            expect(await token.balanceOf(pool.address)).to.be.bignumber.equal('0')
        });
    });

    describe("Pledge to a pool", function() {
        let pledger = accounts[2]
        let amount = auctionSpec._reserveStake

        beforeEach(async () => {
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
            pool = await deployAndregisterPoolWithReward(poolSpec, auctionSpec._AID)
        });

        it("should fail to pledge to a non-registered pool", async () => {
            // try to pledge to the auctionContract address instead of the registered pool
            await expectRevert(instance.pledgeStake(auctionSpec._AID, instance.address, amount, {from: pledger}), "Not a registered pool")
        });
        it("should pledge to the pool, reduce the pledgers ERC20 balance and increase both stakerDeposit and poolDeposit and log the event", async () => {
            let balancePre = await token.balanceOf(pledger)
            let receipt = await instance.pledgeStake(auctionSpec._AID, pool.address, amount, {from: pledger})
            await expectEvent.inLogs(receipt.logs, "NewPledge", {AID: new BN(auctionSpec._AID),
                                                                 _from: pledger,
                                                                 operator: pool.address,
                                                                 amount: amount})
            // check ERC20 balances
            expect(await token.balanceOf(pledger)).to.be.bignumber.equal(balancePre.sub(amount))
            expect(await token.balanceOf(instance.address)).to.be.bignumber.equal(auctionSpec._totalStakingRewards.add(poolSpec._totalReward).add(amount))
            // check contract states
            let [selfStakerDeposits, pledges, poolSelfStakerDeposit, poolDeposits] = await getDeposits([pledger], [pool.address])
            let pledgingReward = calcExpPledgingReward(poolSpec, amount)
            assert.equal(pledges[0], amount.add(pledgingReward).toString())
            assert.equal(poolDeposits[0], amount.add(poolSpec._totalReward).toString())
        });
        it("should fail to pledge more than the pool has committed rewards for", async () => {
            let pledger2 = accounts[3]
            await instance.pledgeStake(auctionSpec._AID, pool.address, poolSpec._maxStake.sub(new BN('100')), {from: pledger})
            await expectRevert(instance.pledgeStake(auctionSpec._AID, pool.address, 200, {from: pledger2}), "Rewards depleted")
        });
        it("should prohibit pledging more than once for the same auction", async () => {
            await instance.pledgeStake(auctionSpec._AID, pool.address, amount, {from: pledger})
            await expectRevert(instance.pledgeStake(auctionSpec._AID, pool.address, amount, {from: pledger}), "Already pledged")
        });
        it("should allow to increase the amount pledged to the same pool within an auction", async () => {
            let topup = new BN('100')
            let expectedReward = calcExpPledgingReward(poolSpec, amount.add(topup))

            let balancePre = await token.balanceOf(pledger)
            await instance.pledgeStake(auctionSpec._AID, pool.address, amount, {from: pledger})
            await instance.increasePledge(pool.address, topup, {from: pledger})
            let balancePost = await token.balanceOf(pledger)

            expect(await instance.pledges__amount.call(pledger)).to.be.bignumber.equal(amount.add(topup).add(expectedReward))
            expect(balancePre.sub(balancePost)).to.be.bignumber.equal( amount.add(topup) )
            expect(await instance.poolDeposits.call(pool.address)).to.be.bignumber.equal(amount.add(topup).add(poolSpec._totalReward))
            expect(await instance.registeredPools__remainingReward.call(pool.address)).to.be.bignumber.equal(poolSpec._totalReward.sub(expectedReward))
        });
        it("should fail to increase a pledge before a pledge has been made for this auction", async () => {
            let topup = new BN('100')
            await expectRevert(instance.increasePledge(pool.address, topup, {from: pledger}), "No pledge made in this auction yet")
        });
        it("should fail to change the pool during an increase", async () => {
            let topup = new BN('100')
            await instance.pledgeStake(auctionSpec._AID, pool.address, amount, {from: pledger})
            await expectRevert(instance.increasePledge(accounts[0], topup, {from: pledger}), "Cannot change pool")
        });
        it("should allow the operator to bid up to totalReward + poolDeposit and move unclaimed pool rewards to selfStake", async () => {
            let N = 8
            let Nbn = new BN(N.toString())
            let pledgers = accounts.slice(2, 2 + N)
            let expUnclaimedPoolRewards = poolSpec._totalReward.sub( Nbn.mul(calcExpPledgingReward(poolSpec, amount)) )
            await addPledges(auctionSpec, pledgers, pool.address, amount)

            let poolDeposits = await instance.poolDeposits.call(pool.address)
            expect(poolDeposits).to.be.bignumber.equal( Nbn.mul(amount).add(poolSpec._totalReward))

            await advanceToPrice(instance, poolDeposits, auctionSpec._reserveStake)
            await pool.bidPledgedStake({from: poolSpec._owner})

            let enteredBids = await getEnteredBidsFromEvents(instance, fromBlock='latest')
            await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids})

            let selfStakerDeposit = await instance.selfStakerDeposits(pool.address)
            expect(selfStakerDeposit).to.be.bignumber.equal(expUnclaimedPoolRewards)
            expect(await instance.getFinalStakerSlots.call(pool.address)).to.be.bignumber.gte(Nbn)

            let poolDepositsPost = await instance.poolDeposits.call(pool.address)
            expect(poolDeposits.sub(poolDepositsPost)).to.be.bignumber.equal(expUnclaimedPoolRewards)

            expect(await instance.registeredPools__remainingReward.call(pool.address)).to.be.bignumber.equal('0')
        });
        it("should allow the operator to bid totalReward + poolDeposit and fill the missing rest with selfStake", async () => {
            let N = 8
            let Nbn = new BN(N.toString())
            let pledgers = accounts.slice(2, 2 + N)
            let expUnclaimedPoolRewards = poolSpec._totalReward.sub( Nbn.mul(calcExpPledgingReward(poolSpec, amount)) )
            await addPledges(auctionSpec, pledgers, pool.address, amount)

            let poolDeposits = await instance.poolDeposits.call(pool.address)
            expect(poolDeposits).to.be.bignumber.equal( Nbn.mul(amount).add(poolSpec._totalReward))

            let currentPrice = await instance.getCurrentPrice.call()
            expect(poolDeposits).to.be.bignumber.lt(currentPrice)

            // Should not have enough funds
            await expectRevert.unspecified(pool.bidPledgedStake.call())

            // Fill with pool-contract funds
            await token.transfer(pool.address, currentPrice.sub(poolDeposits), {from: poolSpec._owner})
            await pool.bidPledgedAndSelfStake(0, {from: poolSpec._owner})
            //  price at same block height as pool.bidPledgedAndSelfStake()
            currentPrice = await instance.getCurrentPrice.call()
            expect(await instance.selfStakerDeposits.call(pool.address)).to.be.bignumber.equal(currentPrice.sub(poolDeposits).add(expUnclaimedPoolRewards))

            // reserveStake is so low that this already clears the auction at some point
            let expectedFinalPrice = currentPrice.div( new BN(auctionSpec._slotsOnSale.toString()) )
            await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: expectedFinalPrice})
            expect(await instance.getFinalStakerSlots.call(pool.address)).to.be.bignumber.equal(auctionSpec._slotsOnSale.toString())
        });
        it("should allow the operator to specify any amount >= current price to bid, fill amount - poolDeposit with selfStake. But throw if amount < current price", async () => {
            let N = 8
            let Nbn = new BN(N.toString())
            let pledgers = accounts.slice(2, 2 + N)
            let expUnclaimedPoolRewards = poolSpec._totalReward.sub( Nbn.mul(calcExpPledgingReward(poolSpec, amount)) )
            await addPledges(auctionSpec, pledgers, pool.address, amount)

            let poolDeposits = await instance.poolDeposits.call(pool.address)
            expect(poolDeposits).to.be.bignumber.equal( Nbn.mul(amount).add(poolSpec._totalReward))

            let currentPrice = await instance.getCurrentPrice.call()
            expect(poolDeposits).to.be.bignumber.lt(currentPrice)

            // Should not have enough funds
            await expectRevert.unspecified(pool.bidPledgedStake.call())

            // should throw if specifying amount < current price
            await expectRevert(pool.bidPledgedAndSelfStake(currentPrice.div( new BN('2') ), {from: poolSpec._owner}), "Amount below price")

            // bid an amount > current price
            let bidAmount = currentPrice.mul( new BN('2') )

            // Fill with pool-contract funds
            await token.transfer(pool.address, bidAmount.sub(poolDeposits), {from: poolSpec._owner})
            await pool.bidPledgedAndSelfStake(bidAmount, {from: poolSpec._owner})
            expect(await instance.selfStakerDeposits.call(pool.address)).to.be.bignumber.equal(bidAmount.sub(poolDeposits).add(expUnclaimedPoolRewards))

            // reserveStake is so low that this already clears the auction at some point
            let expectedFinalPrice = bidAmount.div( new BN(auctionSpec._slotsOnSale.toString()) )
            await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: expectedFinalPrice})
            expect(await instance.getFinalStakerSlots.call(pool.address)).to.be.bignumber.equal(auctionSpec._slotsOnSale.toString())
        });
    });

    describe("withdrawPledgedStake", function() {
        let N = 8
        let pledgers = accounts.slice(2, 2 + N)
        let pledger = pledgers[0]
        let amount = new BN('100')
        let enteredBids = []

        beforeEach(async () => {
            token = await deployToken(auctionSpec, accounts, initialBalance);
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
            pool = await deployAndregisterPoolWithReward(poolSpec, auctionSpec._AID)
            await addPledges(auctionSpec, pledgers, pool.address, amount)

            await token.transfer(pool.address, auctionSpec._startStake, {from: poolSpec._owner})
            await pool.bidPledgedAndSelfStake(0, {from: poolSpec._owner})
            enteredBids = await getEnteredBidsFromEvents(instance, fromBlock='latest')

            expect(await instance.pledges__amount.call(pledger)).to.be.bignumber.gt('0')
        });

        it("should fail to withdraw pledged stake before bidding is over", async () => {
            let withdrawal = await instance.withdrawPledgedStake.call({from: pledger})
            expect(withdrawal).to.be.bignumber.equal('0')
        });
        it("should fail to withdraw pledged stake before auction lockup has ended", async () => {
            await advanceToBlock(auctionSpec._auctionEnd)
            let withdrawal = await instance.withdrawPledgedStake.call({from: pledger})
            expect(withdrawal).to.be.bignumber.equal('0')
        });
        it("should allow to withdraw pledged stake + pool reward after auction lockup has ended", async () => {
            let expectedReward = calcExpPledgingReward(poolSpec, amount)

            // reserveStake is so low that this already clears the auction at some point
            // let expectedFinalPrice = enteredBid.div( new BN(auctionSpec._slotsOnSale.toString()) )
            await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids})
            await advanceAndEndLockup(auctionSpec, instance)

            let balancePre = await token.balanceOf(pledger)
            await instance.withdrawPledgedStake({from: pledger})
            let balancePost = await token.balanceOf(pledger)
            expect(balancePost.sub(balancePre)).to.be.bignumber.equal(amount.add(expectedReward))
            expect(balancePost).to.be.bignumber.equal(initialBalance.add(expectedReward))
        });
    });

    describe("retrieveUnclaimedPoolRewards", function() {
        let N = 8
        let Nbn = new BN(N.toString())
        let pledgers = accounts.slice(2, 2 + N)
        let pledger = pledgers[0]
        let amount = new BN('100')

        beforeEach(async () => {
            token = await deployToken(auctionSpec, accounts, initialBalance);
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
            pool = await deployAndregisterPoolWithReward(poolSpec, auctionSpec._AID)
            await addPledges(auctionSpec, pledgers, pool.address, amount)
        });

        it("should fail to move unclaimed pool rewards to selfStake before bidding phase is over", async () => {
            assert.ok(await instance.isBiddingPhase.call())
            await expectRevert.unspecified(pool.retrieveUnclaimedPoolRewards({from: poolSpec._owner}))
        });
        it("should allow to move unclaimed pool rewards into selfStake after bidding is over and not allow to claim them repeatedly", async () => {
            let expectedUnclaimedRewards = poolSpec._totalReward.sub( Nbn.mul(calcExpPledgingReward(poolSpec, amount)) )
            expect(expectedUnclaimedRewards).to.be.bignumber.gt('0')
            let poolDepositPre = await instance.poolDeposits.call(pool.address)
            let selfStakePre = await instance.selfStakerDeposits.call(pool.address)

            await advanceToBlock(auctionSpec._auctionEnd)
            await pool.retrieveUnclaimedPoolRewards({from: poolSpec._owner})

            let poolDepositPost = await instance.poolDeposits.call(pool.address)
            let selfStakePost = await instance.selfStakerDeposits.call(pool.address)

            expect(poolDepositPre.sub(poolDepositPost)).to.be.bignumber.equal(expectedUnclaimedRewards)
            expect(selfStakePost.sub(selfStakePre)).to.be.bignumber.equal(expectedUnclaimedRewards)

            expect(await instance.registeredPools__remainingReward.call(pool.address)).to.be.bignumber.equal('0')
        });
    });

    describe("Pool operator stake", function() {
        let N = 8
        let Nbn = new BN(N.toString())
        let pledgers = accounts.slice(2, 2 + N)
        let pledger = pledgers[0]
        let amount = new BN('1000').mul(FET_ERC20.multiplier)

        beforeEach(async () => {
            token = await deployToken(auctionSpec, accounts, initialBalance);
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
            pool = await deployAndregisterPoolWithReward(poolSpec, auctionSpec._AID)
            await addPledges(auctionSpec, pledgers, pool.address, amount)
        });

        it("should not require any lockups from the pool operator after bidding phase except unclaimed poolRewards, if only bidding poolDeposits", async () => {
            await advanceToPrice(instance, Nbn.mul(amount).add(poolSpec._totalReward), auctionSpec._reserveStake)

            let unclaimedPoolRewards = await instance.registeredPools__remainingReward.call(pool.address)
            await pool.bidPledgedStake({from: poolSpec._owner})

            let enteredBids = await getEnteredBidsFromEvents(instance, fromBlock='latest')
            await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids})

            await pool.retrieveUnclaimedPoolRewards({from: poolSpec._owner})

            let selfStakeNeeded = await instance.calculateSelfStakeNeeded.call(pool.address)
            expect(selfStakeNeeded).to.be.bignumber.equal(unclaimedPoolRewards)
        });
        it("should keep the selfStake bid of the pool operator locked if bidding own stake", async () => {
            let expectedUnclaimedRewards = poolSpec._totalReward.sub( Nbn.mul(calcExpPledgingReward(poolSpec, amount)) )
            let pledgedFunds_minusUnclaimedRewards = ( Nbn.mul(amount).add(poolSpec._totalReward) ).sub(expectedUnclaimedRewards)

            await token.transfer(pool.address, auctionSpec._startStake, {from: poolSpec._owner})
            await pool.bidPledgedAndSelfStake(0, {from: poolSpec._owner})

            let enteredBids = await getEnteredBidsFromEvents(instance, fromBlock='latest')
            let {_, finalPrice} = await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids})
            let expectedLockup = await instance.getFinalStakerSlots.call(pool.address).then(slots => slots.mul(finalPrice))

            let [__, ___, poolSelfStakerDeposit, poolDeposits] = await getDeposits([], [pool.address])

            let selfStakeNeeded = await instance.calculateSelfStakeNeeded.call(pool.address)
            expect(selfStakeNeeded).to.be.bignumber.equal(expectedLockup.sub(pledgedFunds_minusUnclaimedRewards))
        });
        it("should be able to withdraw selfStake to the owner after lockupEnd and result in a profit of auction reward - claimed pool rewards", async () => {
            await token.transfer(pool.address, auctionSpec._startStake, {from: poolSpec._owner})
            await pool.bidPledgedAndSelfStake(0, {from: poolSpec._owner})
            let enteredBids = await getEnteredBidsFromEvents(instance, fromBlock='latest')
            await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids})

            let slotsWon = await instance.getFinalStakerSlots.call(pool.address)
            expect(slotsWon).to.be.bignumber.gt('0')
            await advanceAndEndLockup(auctionSpec, instance)

            await pool.withdrawSelfStake({from: poolSpec._owner})
            await pool.retrievePoolBalance(0, {from: poolSpec._owner})
            expect(await instance.selfStakerDeposits.call(pool.address)).to.be.bignumber.equal('0')

            let claimedPoolRewards = Nbn.mul(calcExpPledgingReward(poolSpec, amount))
            let wonAuctionRewards = auctionSpec._rewardPerSlot.mul(slotsWon)

            let [contractBalance, poolOwnerBalances, poolBalances] = await getTokenBalances(token, instance, [poolSpec._owner], [pool.address])
            assert.equal(poolBalances[0], '0', "Pool balance should be 0")
            assert.equal(poolOwnerBalances[0], initialBalance.add(wonAuctionRewards).sub(claimedPoolRewards).toString(), "Wrong pool owner profits")
            assert.equal(contractBalance, auctionSpec._totalStakingRewards.sub(wonAuctionRewards).add( Nbn.mul(amount) ).add(claimedPoolRewards).toString() )
        });
        it("should fail register a new pool in a second auction with unclaimed rewards (but succeed after withdrawing them)", async () => {
            let AID = 2
            await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: auctionSpec._reserveStake})
            await advanceAndEndLockup(auctionSpec, instance)
            await initialiseAuction(auctionSpec, token, instance);

            let remainingReward = await instance.registeredPools__remainingReward.call(pool.address)
            expect(remainingReward).to.be.bignumber.gt('0')

            await token.transfer(pool.address, poolSpec._totalReward, {from: poolSpec._owner})
            await expectRevert.unspecified(pool.registerPool(AID, poolSpec._maxStake, poolSpec._totalReward, poolSpec.rewardPerTok, {from: poolSpec._owner}))

            await pool.retrieveUnclaimedPoolRewards({from: poolSpec._owner})
            await pool.registerPool(AID, poolSpec._maxStake, poolSpec._totalReward, poolSpec.rewardPerTok, {from: poolSpec._owner})
        });
    });

    describe("Repeated auctions", function() {
        let auctionSpec1 = Object.assign({}, auctionSpec);
        let auctionSpec2 = Object.assign({}, auctionSpec);
        auctionSpec2._AID = 2
        auctionSpec2._reserveStake = new BN('50')  // lower than auctionSpeca._reserveStake
        expect(auctionSpec2._reserveStake).to.be.bignumber.lt(auctionSpec1._reserveStake)

        let poolSpec1 = Object.assign({}, poolSpec);
        poolSpec1._pledgers = [accounts[3], accounts[4], accounts[5]]
        poolSpec1._pledgeAmount = new BN('1000')
        poolSpec1.rewardPerTok = calc_rewardPerTok(poolSpec1)
        poolSpec1._expectedReward = calcExpPledgingReward(poolSpec1, poolSpec1._pledgeAmount)

        let pool2
        let poolSpec2 = Object.assign({}, poolSpec);
        poolSpec2._owner = accounts[2]
        poolSpec2._pledgers = [accounts[6], accounts[7]]
        poolSpec2._pledgeAmount = new BN('4000')
        poolSpec2.rewardPerTok = calc_rewardPerTok(poolSpec2)
        poolSpec2._expectedReward = calcExpPledgingReward(poolSpec2, poolSpec2._pledgeAmount)

        let slotsWon1 = []

        // Initialise and finalize AID 1, initialise AID 2
        beforeEach(async function() {
            // redeploy token to ensure inital balance is correct
            token = await deployToken(auctionSpec1, accounts, initialBalance);
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec1, token, instance, accounts);

            // AID 1
            await initialiseAuction(auctionSpec1, token, instance);
            pool = await deployAndregisterPoolWithReward(poolSpec1, auctionSpec1._AID)
            await addPledges(auctionSpec1, poolSpec1._pledgers, pool.address, poolSpec1._pledgeAmount)
            pool2 = await deployAndregisterPoolWithReward(poolSpec2, auctionSpec1._AID)
            await addPledges(auctionSpec1, poolSpec2._pledgers, pool2.address, poolSpec2._pledgeAmount)

            await token.transfer(pool.address, auctionSpec1._startStake, {from: poolSpec1._owner})
            await token.transfer(pool2.address, auctionSpec1._startStake, {from: poolSpec2._owner})
            await pool.bidPledgedAndSelfStake(0, {from: poolSpec1._owner})
            await pool2.bidPledgedAndSelfStake(0, {from: poolSpec2._owner})

            let enteredBids1 = await getEnteredBidsFromEvents(instance)
            await advanceAndFinaliseAuction(auctionSpec1, instance, {enteredBids: enteredBids1})

            auctionSpec1.finalStake = await instance.getCurrentPrice.call()

            slotsWon1.push(await instance.getFinalStakerSlots.call(pool.address))
            slotsWon1.push(await instance.getFinalStakerSlots.call(pool2.address))

            await advanceAndEndLockup(auctionSpec1, instance)
            // O/w the rewards per slot of AID 2 will include undistributed rewards from AID 1
            await instance.retrieveUndistributedAuctionRewards()

            // AID 2
            await initialiseAuction(auctionSpec2, token, instance);
        });

        it("should allow a pool contract to register a new pool for the second auction, leaving the first one unchanged", async () => {
            await pool.registerPool(auctionSpec2._AID, poolSpec1._maxStake, poolSpec1._totalReward, poolSpec1.rewardPerTok, {from: poolSpec1._owner})
        });
        it("should allow a pledger to withdraw after next auction was initialised, as long as he hasn't re-pledged anything", async () => {
            let pledger = poolSpec1._pledgers[0]
            let pledgedAID1 = poolSpec1._pledgeAmount + poolSpec1._expectedReward

            await instance.withdrawPledgedStake({from: pledger})
            expect(await instance.pledges__amount.call(pledger)).to.be.bignumber.equal('0')
            expect(await token.balanceOf(pledger)).to.be.bignumber.equal(initialBalance.add(poolSpec1._expectedReward))
        });
        describe("Second pledge", function() {
            let pledger = poolSpec1._pledgers[0]
            let pledgedAID1 = poolSpec1._pledgeAmount.add(poolSpec1._expectedReward)

            beforeEach(async function() {
                await registerPoolWithReward(pool2, poolSpec2, auctionSpec2._AID)
                let registeredPledgedAID1 = await instance.pledges__amount.call(pledger)
                expect(registeredPledgedAID1).to.be.bignumber.equal(pledgedAID1)
            });

            it("should allow a pledger to pledge existing amounts from auction1 (pledgeAmount1 + pool rewards) to auction2", async () => {
                let balancePre = await token.balanceOf(pledger)
                // set allowance for pledger to 0
                await token.approve(instance.address, 0, {from: pledger})
                await expectRevert.unspecified(instance.pledgeStake(auctionSpec2._AID, pool.address, pledgedAID1 + 1, {from: pledger}))

                await instance.pledgeStake(auctionSpec2._AID, pool2.address, pledgedAID1, {from: pledger})

                let balancePost = await token.balanceOf(pledger)
                expect(balancePost.sub(balancePre)).to.be.bignumber.equal('0')
                expect(balancePost).to.be.bignumber.equal(initialBalance.sub(poolSpec1._pledgeAmount))

                let stakerDeposit = await instance.pledges__amount.call(pledger)
                expect(stakerDeposit).to.be.bignumber.equal(pledgedAID1.add(calcExpPledgingReward(poolSpec2, pledgedAID1)))
            });
            it("should allow to increase the pledge in auction2 and transfer the correct topup", async () => {
                let topup = new BN('999')
                let newPledge = poolSpec1._pledgeAmount.add(poolSpec1._expectedReward).add(topup)
                let balancePre = await token.balanceOf(pledger)

                // use pledger from (AID1, pool1) on pool2 now
                await token.approve(instance.address, newPledge, {from: pledger})
                await instance.pledgeStake(auctionSpec2._AID, pool2.address, newPledge, {from: pledger})

                let pledgedAID2 = await instance.pledges__amount.call(pledger)
                expect(pledgedAID2).to.be.bignumber.equal(newPledge.add(calcExpPledgingReward(poolSpec2, newPledge)))

                let balancePost = await token.balanceOf(pledger)
                expect(balancePre.sub(balancePost)).to.be.bignumber.equal(topup)
                expect(balancePost).to.be.bignumber.equal(initialBalance.sub(poolSpec1._pledgeAmount).sub(topup))

                let stakerDeposit = await instance.pledges__amount.call(pledger)
                expect(stakerDeposit).to.be.bignumber.equal(newPledge.add(calcExpPledgingReward(poolSpec2, newPledge)))
            });
            it("should allow to reduce the pledge in auction2 and refund the difference", async () => {
                let reduction = new BN('300')
                let newPledge = pledgedAID1.sub(reduction)
                let balancePre = await token.balanceOf(pledger)
                await token.approve(instance.address, 0, {from: pledger})

                await instance.pledgeStake(auctionSpec2._AID, pool2.address, newPledge, {from: pledger})

                let balancePost = await token.balanceOf(pledger)
                expect(balancePost.sub(balancePre)).to.be.bignumber.equal(reduction)
                expect(balancePost).to.be.bignumber.equal(initialBalance.sub(poolSpec1._pledgeAmount).add(reduction))
                expect(balancePost).to.be.bignumber.equal(initialBalance.sub(newPledge).add(poolSpec1._expectedReward))

                let stakerDeposit = await instance.pledges__amount.call(pledger)
                expect(stakerDeposit).to.be.bignumber.equal(newPledge.add(calcExpPledgingReward(poolSpec2, newPledge)))
            });
        });
        it("should correctly take into account existing stelfStaker deposits of pool operators when bidding", async () => {
            let expectedUnclaimedRewards = poolSpec._totalReward
            let exisitingSelfStake = await instance.selfStakerDeposits.call(pool2.address)
            expect(exisitingSelfStake).to.be.bignumber.gt('0')

            await registerPoolWithReward(pool2, poolSpec2, auctionSpec2._AID)
            let poolDeposits = await instance.poolDeposits.call(pool2.address)
            // should reset the poolDeposits
            expect(poolDeposits).to.be.bignumber.equal(poolSpec2._totalReward)
            await pool2.bidPledgedAndSelfStake(0, {from: poolSpec2._owner})
            //  this will be calculated at the same block height at which the bid was made
            let currentPrice = await instance.getCurrentPrice.call()

            let expSelfStakeAdded = currentPrice.sub(exisitingSelfStake).sub(poolSpec2._totalReward)
            let newSelfStake = await instance.selfStakerDeposits.call(pool2.address)

            // expect(newSelfStake.sub(exisitingSelfStake).sub(expectedUnclaimedRewards).sub(auctionSpec2._rewardPerSlot)).to.be.bignumber.equal(expSelfStakeAdded)
            expect(newSelfStake.sub(exisitingSelfStake).sub(expectedUnclaimedRewards)).to.be.bignumber.equal(expSelfStakeAdded)
        });
        it("should result in correct final balances and profits after two auctions", async () => {
            let poolVars = [[poolSpec1, pool], [poolSpec2, pool2]]

            for (poolID=0; poolID<poolVars.length; poolID++){
                let [poolSpec, poolInstance] = poolVars[poolID]

                await registerPoolWithReward(poolInstance, poolSpec, auctionSpec2._AID)
                await addPledges(auctionSpec2, poolSpec._pledgers, poolInstance.address, poolSpec._pledgeAmount.add(poolSpec._expectedReward))
                await poolInstance.bidPledgedAndSelfStake(0, {from: poolSpec._owner})
            }

            let enteredBids2 = await getEnteredBidsFromEvents(instance, undefined, AID='2')
            await advanceAndFinaliseAuction(auctionSpec2, instance, {enteredBids: enteredBids2})

            let slotsWon2 = []
            slotsWon2.push(await instance.getFinalStakerSlots.call(pool.address))
            slotsWon2.push(await instance.getFinalStakerSlots.call(pool2.address))
            await advanceAndEndLockup(auctionSpec2, instance)

            // pledgers
            let pledgers = poolSpec1._pledgers.concat(poolSpec2._pledgers)
            let expPledgerBalanceAndProfits = []

            for (id=0; id<pledgers.length; id++){
                await instance.withdrawPledgedStake({from: pledgers[id]})

                let profit = new BN('0')
                if (poolSpec1._pledgers.includes(pledgers[id])){ profit = poolSpec1._expectedReward.add( calcExpPledgingReward(poolSpec1, poolSpec1._pledgeAmount.add(poolSpec1._expectedReward)) ) }
                else if (poolSpec2._pledgers.includes(pledgers[id])){ profit = poolSpec2._expectedReward.add( calcExpPledgingReward(poolSpec2, poolSpec2._pledgeAmount.add(poolSpec2._expectedReward)) ) }
                expPledgerBalanceAndProfits.push( initialBalance.add(profit).toString() )
            }

            let [_, pledgerBalances, __] = await getTokenBalances(token, instance, pledgers)
            assert.deepEqual(pledgerBalances, expPledgerBalanceAndProfits)

            // pools and operators
            let expPoolBalanceAndProfits = []
            for (poolID=0; poolID<poolVars.length; poolID++){
                let [poolSpec, poolInstance] = poolVars[poolID]
                await poolInstance.withdrawSelfStake({from: poolSpec._owner})
                await poolInstance.retrievePoolBalance(0, {from: poolSpec._owner})

                let l = new BN(poolSpec._pledgers.length.toString())
                let expectedClaimedReward1 = l.mul(poolSpec._expectedReward)
                let expectedClaimedReward2 = l.mul( calcExpPledgingReward(poolSpec, poolSpec._pledgeAmount.add(poolSpec._expectedReward)) )

                let rewardsWon1 = slotsWon1[poolID].mul(auctionSpec1._rewardPerSlot)
                let rewardsWon2 = slotsWon2[poolID].mul(auctionSpec2._rewardPerSlot)
                let profit = rewardsWon1.add(rewardsWon2).sub(expectedClaimedReward1).sub(expectedClaimedReward2)
                expPoolBalanceAndProfits.push( initialBalance.add(profit).toString() )
            }

            await instance.retrieveUndistributedAuctionRewards()

            let [contractBalance, poolOwnerBalances, poolBalances] = await getTokenBalances(token, instance, [poolSpec1._owner, poolSpec2._owner], [pool.address, pool2.address])
            assert.equal(contractBalance, '0')
            assert.deepEqual(poolBalances, ['0', '0'])
            assert.deepEqual(poolOwnerBalances, expPoolBalanceAndProfits)

            let [selfStakerDeposits, pledges, poolSelfStakerDeposit, poolDeposits] = await getDeposits(accounts, [pool.address, pool2.address])
            assert.deepEqual(selfStakerDeposits, new Array(accounts.length).fill('0'))
            assert.deepEqual(poolSelfStakerDeposit, new Array(poolVars.length).fill('0'))
            // Only one not getting cleaned up atm (until the same operator registers a new pool)
            // assert.deepEqual(poolDeposits, new Array(poolVars.length).fill(0))
        });
    });

    describe("Switching between pool operator and normal bidder", function() {
        let auctionSpec1 = Object.assign({}, auctionSpec);
        auctionSpec1._totalStakingRewards = new BN('0')
        let auctionSpec2 = Object.assign({}, auctionSpec1);
        auctionSpec2._AID = 2

        let poolSpec1 = {
            _maxStake : auctionSpec1._reserveStake,
            _totalReward : new BN('10').mul(FET_ERC20.multiplier),
            _owner : accounts[1]
        }
        poolSpec1._pledgeAmount = auctionSpec1._reserveStake
        poolSpec1._pledgers = [accounts[3]]
        poolSpec1.rewardPerTok = calc_rewardPerTok(poolSpec1)
        poolSpec1._expectedReward = calcExpPledgingReward(poolSpec1, poolSpec1._pledgeAmount)

        const endAuctionGetSlots = async function(auctionSpec, poolSpec){
            let enteredBids1 = await getEnteredBidsFromEvents(instance)
            await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids1})

            // let finalStake = await instance.getCurrentPrice.call()
            let slotsWon = await instance.getFinalStakerSlots.call(poolSpec._owner)

            await advanceAndEndLockup(auctionSpec, instance)
            // O/w the rewards per slot of AID 2 will include undistributed rewards from AID 1
            await instance.retrieveUnclaimedPoolRewards({from: poolSpec1._owner})
            await instance.retrieveUndistributedAuctionRewards()
            return slotsWon
        }

        // Initialise and finalize AID 1, initialise AID 2
        beforeEach(async function() {
            // redeploy token to ensure inital balance is correct
            token = await deployToken(auctionSpec1, accounts, initialBalance);
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec1, token, instance, accounts);
        });

        it("should reset the pledged stake when running a pool in auction 1 but directly bidding in auction 2", async () => {
            // AID 1
            await initialiseAuction(auctionSpec1, token, instance);
            await registerWalletPool(token, instance, poolSpec1, auctionSpec1._AID)
            await addPledges(auctionSpec1, poolSpec1._pledgers, poolSpec1._owner, poolSpec1._pledgeAmount)

            await advanceToPrice(instance, auctionSpec._reserveStake, auctionSpec._reserveStake)
            await instance.bid(0, {from: poolSpec1._owner})

            const slotsWon1 = await endAuctionGetSlots(auctionSpec1, poolSpec1)

            // AID 2
            await initialiseAuction(auctionSpec2, token, instance);
            await advanceToPrice(instance, auctionSpec2._reserveStake, auctionSpec2._reserveStake)
            await instance.bid(0, {from: poolSpec1._owner})

            expect(await instance.poolDeposits.call(poolSpec1._owner)).to.be.bignumber.equal('0')

            
            const slotsWon2 = await endAuctionGetSlots(auctionSpec2, poolSpec1)

            expect(slotsWon1).to.be.bignumber.equal('1')
            expect(slotsWon2).to.be.bignumber.equal('1')
        });
    });
});
