const { BN, constants, expectEvent, expectRevert, time } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const dutchStaking = artifacts.require("dutchStaking");

const { deployToken, initialiseAuction, approveAll, addNBids, advanceToBlock, advanceToPrice, advanceAndEndLockup,
        filterEventValue, getTokenBalances, advanceAndFinaliseAuction, calcTrueFinalPrice, getEnteredBidsFromEvents,
        registerWalletPool, calc_rewardPerTok } = require('../utility/utils');
const { AuctionConstants, FET_ERC20 } = require("../utility/constants.js")

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

contract("dutchStaking - selfStaking", async accounts => {
    let instance, token
    // ERC20 balance given to every account when deploying the token
    let initialBalance = new BN('100000').mul(FET_ERC20.multiplier)

    let auctionSpec = {
        _AID : 1,
        _startStake : new BN('1100').mul(FET_ERC20.multiplier),
        _reserveStake : new BN('100').mul(FET_ERC20.multiplier),
        _duration : 30,
        _lockup_duration: 25,
        _slotsOnSale : 8,
        _auctionStart : 0,  // adjusted within initialiseAuction
        _auctionEnd : 0,    // adjusted within initialiseAuction
        _lockupEnd : 0,    // adjusted within initialiseAuction
        _totalStakingRewards : new BN('1000').mul(FET_ERC20.multiplier),
        _owner : accounts[0]  // truffle default
    }

    // div returns integer division (i.e. floor())
    auctionSpec._rewardPerSlot = auctionSpec._totalStakingRewards.div( new BN(auctionSpec._slotsOnSale.toString()) )
    // integer ceil()
    let expDeclinePerBlock = (auctionSpec._startStake
                              .sub(auctionSpec._reserveStake)
                              .add( new BN((auctionSpec._duration - 1).toString()) )
                              .div( new BN(auctionSpec._duration.toString()) ))

    auctionSpec.declinePerBlock = expDeclinePerBlock

    // return strings to be able to easily use deepEqual with BNs
    const withdrawSelfStake_checkBalances = async function(instance, token, addresses){
        let depositsPre = [], depositsPost = [], balancesPre = [], balancesPost = [], balanceDiffs = []
        for (i=0; i<addresses.length; i++){
            let account = addresses[i]
            let depositPre = await instance.selfStakerDeposits.call(account)
            let balancePre = await token.balanceOf(account)
            await instance.withdrawSelfStake({from: account})
            let depositPost = await instance.selfStakerDeposits.call(account)
            let balancePost = await token.balanceOf(account)

            depositsPre.push(depositPre.toString())
            depositsPost.push(depositPost.toString())
            balancesPre.push(balancePre.toString())
            balancesPost.push(balancePost.toString())
            balanceDiffs.push(balancePost.sub(balancePre).toString())
        }
        return [depositsPre, depositsPost, balancesPre, balancesPost, balanceDiffs]
    }

    const getSlots = async function(bidder){
        let slots = await instance.getFinalStakerSlots.call(bidder)
        return slots.toString()
    }

    before(async () => {
        token = await deployToken(auctionSpec, accounts, initialBalance);
    });

    describe("FET token", function() {
        it("should result in a totalSupply of 1152997575000000000000000000, matching the deployed ERC20 on etherscan", async () => {
            expect( await token.decimals()).to.be.bignumber.equal('18')
            expect( await token.totalSupply()).to.be.bignumber.equal('1152997575000000000000000000')
        });
        //it("should release the token", async () => {
        //    expect(await token.released()).to.be.true
        //});
    });

    describe("Initialise an auction", function() {
        before(async () => {
            instance = await dutchStaking.new(token.address);
        });

        it("should fail to bid without an auction", async () => {
            await expectRevert(instance.bid(0), "Not in bidding phase");
        });
        it("should return isBiddingPhase as false without an auction", async () => {
            assert.equal(await instance.isBiddingPhase.call(), false)
        });
        it("should initialise the auction, increase the currentAID, add auction rewards and return isBiddingPhase = true", async () => {
            let currentAIDInit = await instance.currentAID.call()
            expect(currentAIDInit).to.be.bignumber.equal('0')

            await token.approve(instance.address, auctionSpec._totalStakingRewards)
            auctionSpec._auctionStart = await web3.eth.getBlockNumber() + 1
            auctionSpec._auctionEnd = auctionSpec._auctionStart + auctionSpec._duration + AuctionConstants._reserve_price_duration
            auctionSpec._lockupEnd = auctionSpec._auctionEnd + auctionSpec._lockup_duration
            let receipt = await instance.initialiseAuction(auctionSpec._auctionStart, auctionSpec._startStake, auctionSpec._reserveStake, auctionSpec._duration, auctionSpec._lockup_duration, auctionSpec._slotsOnSale, auctionSpec._totalStakingRewards)

            assert.ok(await instance.isBiddingPhase.call())
            await expectEvent.inLogs(receipt.logs, "NewAuction", {AID: new BN(1),
                                                                  start: new BN(auctionSpec._auctionStart),
                                                                  end: new BN(auctionSpec._auctionEnd),
                                                                  lockupEnd: new BN(auctionSpec._lockupEnd),
                                                                  startStake: new BN(auctionSpec._startStake),
                                                                  reserveStake: new BN(auctionSpec._reserveStake),
                                                                  declinePerBlock: new BN(expDeclinePerBlock),
                                                                  slotsOnSale: new BN(auctionSpec._slotsOnSale),
                                                                  rewardPerSlot: new BN(auctionSpec._rewardPerSlot)})
        });
        it("should fail to initialise a new auction while already one running", async () => {
            await token.approve(instance.address, auctionSpec._totalStakingRewards)
            auctionSpec._auctionStart = await web3.eth.getBlockNumber() + 1
            await expectRevert(instance.initialiseAuction(auctionSpec._auctionStart, auctionSpec._startStake, auctionSpec._reserveStake, auctionSpec._duration, auctionSpec._lockup_duration, auctionSpec._slotsOnSale, auctionSpec._totalStakingRewards),
                               "End current auction");
        });
        it("should be able to initialise an auction with zero reward", async () => {
            instance = await dutchStaking.new(token.address);

            let auctionSpecCopy = Object.assign({}, auctionSpec);
            auctionSpecCopy._totalStakingRewards = new BN('0')
            auctionSpecCopy._rewardPerSlot = auctionSpecCopy._totalStakingRewards.div( new BN(auctionSpecCopy._slotsOnSale.toString()) )

            await token.approve(instance.address, auctionSpecCopy._totalStakingRewards)
            auctionSpecCopy._auctionStart = await web3.eth.getBlockNumber() + 1
            let receipt = await instance.initialiseAuction(auctionSpecCopy._auctionStart, auctionSpecCopy._startStake, auctionSpecCopy._reserveStake, auctionSpecCopy._duration, auctionSpecCopy._lockup_duration, auctionSpecCopy._slotsOnSale, auctionSpecCopy._totalStakingRewards);
            await expectEvent.inLogs(receipt.logs, "NewAuction", {rewardPerSlot: new BN(auctionSpecCopy._rewardPerSlot)})

            let totalAuctionRewards = await instance.totalAuctionRewards.call()
            expect(totalAuctionRewards).to.be.bignumber.equal('0')
        });
    });

    describe("getCurrentPrice", function() {
        beforeEach(async () => {
            instance = await dutchStaking.new(token.address);
        });

        it("should return 0 without an auction", async () => {
            let currentPrice = await instance.getCurrentPrice.call()
            expect(currentPrice).to.be.bignumber.equal('0')
        });
        it("should return the startStake before auction start", async () => {
            await initialiseAuction(auctionSpec, token, instance, {start: await web3.eth.getBlockNumber() + 10})
            expect(await instance.getCurrentPrice.call()).to.be.bignumber.equal(auctionSpec._startStake)
        });
        it("should decay getCurrentPrice linearly down to reserveStake", async () => {
            await initialiseAuction(auctionSpec, token, instance)

            let expPrice = [];
            let queriedPrice = [];
            let decline = new BN('0')

            for (i=0; i < auctionSpec._duration + AuctionConstants._reserve_price_duration; i++) {
                let price = await instance.getCurrentPrice.call()
                let expected

                expected = auctionSpec._startStake.sub(decline)
                if ( expected.lt(auctionSpec._reserveStake) ){
                    expected = auctionSpec._reserveStake
                }
                expPrice.push(expected.toString())
                queriedPrice.push(price.toString())
                decline = decline.add(expDeclinePerBlock)

                if (i == 0){ expect(price).to.be.bignumber.equal(auctionSpec._startStake)}
                if (i >= auctionSpec._duration){ expect(price).to.be.bignumber.equal(auctionSpec._reserveStake)}

                await time.advanceBlock()
            }
            assert.deepEqual(queriedPrice, expPrice)
        });
    });

    describe("calculateSelfStakeNeeded before finaliseAuction", function() {
        beforeEach(async () => {
            instance = await dutchStaking.new(token.address);
        });

        it("should return 0 without deposit if no auction is running", async () => {
            expect(await instance.calculateSelfStakeNeeded.call(accounts[0])).to.be.bignumber.equal('0')
        });
        it("should return 0 for non-bidder if auction is running", async () => {
            await initialiseAuction(auctionSpec, token, instance)
            expect(await instance.calculateSelfStakeNeeded.call(accounts[0])).to.be.bignumber.equal('0')
        });
        it("should throw for bidder if auction is running", async () => {
            await token.approve(instance.address, auctionSpec._startStake, {from: accounts[0]})
            await initialiseAuction(auctionSpec, token, instance)

            await instance.bid(0, {from: accounts[0]})
            expect(await web3.eth.getBlockNumber()).to.be.equal(auctionSpec._auctionStart + 1)
            await expectRevert(instance.calculateSelfStakeNeeded(accounts[0]), "Is bidder and auction not finalised yet")
        });
    });

    describe("Bidding", function() {
        let bidder = accounts[0]

        beforeEach(async function() {
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
            assert.ok(await instance.isBiddingPhase(), "Bidding phase should be open")
        });

        it("should place a valid bid at currentPrice and add bid as a selfStakerDeposit", async () => {
            let receipt = await instance.bid(0, {from: bidder})
            let currentPrice = await instance.getCurrentPrice.call()
            await expectEvent.inLogs(receipt.logs, "Bid", {amount: currentPrice})

            expect(await instance.selfStakerDeposits.call(bidder)).to.be.bignumber.equal(currentPrice)
        });
        it("should update slotsSold and not allow to check stakerSlots as they are not yet final", async () => {
            let currentPrice = await instance.getCurrentPrice.call()
            await instance.bid(0, {from: bidder})

            expect((await instance.auction.call()).slotsSold).to.be.bignumber.equal('1')
            await expectRevert(instance.getFinalStakerSlots.call(bidder), "Slots not yet final")
        });
        it("should not allow multiple bids from same address", async () => {
            await instance.bid(0, {from: bidder})
            await expectRevert(instance.bid(0, {from: bidder}), "Sender already bid");
        });
        it("should not allow bids with a deposit below currentPrice", async () => {
            let currentPrice = await instance.getCurrentPrice.call()
            // currentPrice is the price one block before calling approve. Approve forwards it another block.
            // So set existing allowance to currentPrice - 2 * declinePerBlock - 1 to have an allowance of price - 1 at bidding time
            await token.approve(instance.address, currentPrice.sub(expDeclinePerBlock).sub(expDeclinePerBlock).sub(new BN('1')), {from: accounts[1]})
            await expectRevert.unspecified(instance.bid(0, {from: accounts[1]}));
        });
        it("should not allow bids with a topup != 0 below what's necessary", async () => {
            let currentPrice = await instance.getCurrentPrice.call()
            // currentPrice is the price one block before calling approve. Approve forwards it another block.
            // So set existing allowance to currentPrice - 2 * declinePerBlock - 1 to have an allowance of price - 1 at bidding time
            await token.approve(instance.address, currentPrice.sub(expDeclinePerBlock).sub(expDeclinePerBlock).sub(new BN('1')), {from: accounts[1]})
            await expectRevert.unspecified(instance.bid(1, {from: accounts[1]}));
        });
        it("should prohibt bids after auction end", async () => {
            await advanceToBlock(auctionSpec._auctionEnd)
            await expectRevert(instance.bid(0, {from: bidder}), "Not in bidding phase");
        });
        it("should prohibt bids after auction cleared", async () => {
            await approveAll(auctionSpec, token, instance, accounts);
            await addNBids(instance, auctionSpec, accounts, {N: auctionSpec._slotsOnSale})
            await expectRevert(instance.bid(0, {from: accounts[auctionSpec._slotsOnSale + 1]}), "Not in bidding phase");
        });
        it("should not allow a bidder to withdraw before auction is finalised, as price and slots might not yet be corret", async () => {
            let receipt = await instance.bid(0, {from: bidder})
            let enteredBid = filterEventValue(receipt, 'Bid', "amount")

            let balancePre = await token.balanceOf(bidder)
            let depositPre = await instance.selfStakerDeposits.call(bidder)

            await expectRevert(instance.withdrawSelfStake({from: bidder}), "Is bidder and auction not finalised yet")
        });
        it("should increase the slots won as price drops and allow succeed to finalise an auction that hasn't cleared", async () => {
            let amount = auctionSpec._reserveStake.mul( new BN('4') )
            await advanceToPrice(instance, amount, auctionSpec._reserveStake)
            await instance.bid(amount, {from: bidder})

            await advanceToBlock(auctionSpec._auctionEnd)
            assert.isNotOk(await instance.isFinalised.call())
            await instance.finaliseAuction(auctionSpec._reserveStake)

            let expSlotsWon = new BN('4')
            expect(await instance.getFinalStakerSlots.call(bidder)).to.be.bignumber.equal(expSlotsWon)
            expect(await instance.calculateSelfStakeNeeded.call(bidder)).to.be.bignumber.equal(expSlotsWon.mul(auctionSpec._reserveStake))
        });
        it("should throw if specifying a topup that's too low", async () => {
            let amount = 1000
            expect(await instance.getCurrentPrice.call()).to.be.bignumber.gt( amount.toString() )
            await expectRevert(instance.bid(amount, {from: bidder}), "Bid below current price")
        });
        it("should allow to bid more than the current price by specifying a topup != 0", async () => {
            // note: BN.mul( new BN('decimal') ) leads to incorrect results
            let amount = auctionSpec._startStake.mul( new BN('3') )//.add( new BN('12232434123'))
            expect(await instance.getCurrentPrice.call()).to.be.bignumber.lt( amount.toString() )
            await instance.bid(amount, {from: bidder})
            expect((await instance.auction.call()).slotsSold).to.be.bignumber.equal('3')
        });
    });

    describe("Finalise auction", function() {
        async function duplicateTests(auctionSpec, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon) {
            // check expected final price
            expect(calcTrueFinalPrice(auctionSpec, enteredBids)).to.be.bignumber.equal(trueFinalPrice)

            // check that trueFinalPrice + 1 fails to finalise
            await expectRevert(instance.finaliseAuction( trueFinalPrice.add( new BN('1') ) ), "finalPrice does not clear auction")
            // check that trueFinalPrice - 1 fails to finalise
            await expectRevert.unspecified(instance.finaliseAuction( trueFinalPrice.sub( new BN('1') ) ))
            // finalise with expected price
            let receipt = await instance.finaliseAuction(trueFinalPrice)
            await expectEvent.inLogs(receipt.logs, "AuctionFinalised", {AID: new BN(1),
                                                                        finalPrice: trueFinalPrice,
                                                                        slotsSold: new BN(expectedTotalSlotsSold)})
            expect((await instance.auction.call()).finalPrice).to.be.bignumber.equal(trueFinalPrice)
            expect((await instance.auction.call()).slotsSold).to.be.bignumber.equal(expectedTotalSlotsSold)
            assert.ok(instance.isFinalised.call())
            // check resulting slots of all bidders
            let slotsWon = await Promise.all(bidders.map(getSlots))
            assert.deepEqual(slotsWon, expectedSlotsWon)
        };

        describe("Auction setup 1", function() {
            assert.equal(auctionSpec._slotsOnSale, 8)

            beforeEach(async function() {
                instance = await dutchStaking.new(token.address);
                await approveAll(auctionSpec, token, instance, accounts);
                await initialiseAuction(auctionSpec, token, instance);
            });

            it("should finalise the auction and update slots if last bid exactly finalises the auction", async () => {
                let bids = [auctionSpec._reserveStake.mul( new BN('3') ),
                            auctionSpec._reserveStake.mul( new BN('3') ),
                            auctionSpec._reserveStake.mul( new BN('2') ).sub( new BN('1') ),  // win only 1 slot, but ensure that it does not yet update finalPrice to reserveStake
                            auctionSpec._reserveStake]
                let bidders = accounts.slice(1, 1 + bids.length)
                let [enteredBids, _] = await addNBids(instance, auctionSpec, bidders, {amounts: bids})

                let expectedTotalSlotsSold = '8'
                let expectedSlotsWon = ['3', '3', '1', '1']
                let trueFinalPrice = auctionSpec._reserveStake

                await duplicateTests(auctionSpec, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon)
            });
            it("should finalise the auction and update slots if last bid exactly finalises the auction at price > reserveStake", async () => {
                let bids = [auctionSpec._reserveStake.mul( new BN('4') ),
                            auctionSpec._reserveStake.mul( new BN('4') ),
                            auctionSpec._reserveStake.mul( new BN('4') ),
                            auctionSpec._reserveStake.mul( new BN('4') )]
                let bidders = accounts.slice(1, 1 + bids.length)
                let [enteredBids, _] = await addNBids(instance, auctionSpec, bidders, {amounts: bids})

                let expectedTotalSlotsSold = '8'
                let expectedSlotsWon = ['2', '2', '2', '2']
                let trueFinalPrice = auctionSpec._reserveStake.mul( new BN('2') )

                await expectRevert(instance.finaliseAuction( trueFinalPrice ), "Suggested solution below current price")
                await advanceToPrice(instance, trueFinalPrice, auctionSpec._reserveStake)

                await duplicateTests(auctionSpec, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon)
            });
            it("should allocate slots to first bidders first", async () => {
                let nBids = 5
                let bids = new Array(nBids).fill( auctionSpec._startStake )
                let bidders = accounts.slice(1, 1 + bids.length)

                let [enteredBids, _] = await addNBids(instance, auctionSpec, bidders, {amounts: bids})

                let expectedTotalSlotsSold = '8'
                let expectedSlotsWon = ['2', '2', '2', '2', '0']
                let trueFinalPrice = calcTrueFinalPrice(auctionSpec, enteredBids, auctionSpec._reserveStake)

                await advanceToPrice(instance, trueFinalPrice, auctionSpec._reserveStake)
                await duplicateTests(auctionSpec, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon)
            });
            it("should allow to bid above startStake and not allow further bids once auction is certain to already clear", async () => {
                let nBids = 2
                let bids = new Array(nBids).fill( auctionSpec._startStake.mul( new BN('4')) )
                let bidders = accounts.slice(1, 1 + bids.length)

                let [enteredBids, _] = await addNBids(instance, auctionSpec, bidders, {amounts: bids})

                //  should allow no further bid as we can be absolutely sure that the auction already clears
                await expectRevert(instance.bid(auctionSpec._startStake.mul( new BN('2')), {from: accounts[nBids + 2]}), "Not in bidding phase")

                let expectedTotalSlotsSold = '8'
                let expectedSlotsWon = ['4', '4']
                let trueFinalPrice = calcTrueFinalPrice(auctionSpec, enteredBids, auctionSpec._reserveStake)

                await advanceToPrice(instance, trueFinalPrice, auctionSpec._reserveStake)
                await duplicateTests(auctionSpec, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon)
            });
            it("should finalise the auction after bidding end if the auction does not clear and not allow to finalise it before bidding phase has ended", async () => {
                let bids = [auctionSpec._reserveStake.mul( new BN('2') ),
                            auctionSpec._reserveStake.mul( new BN('2') ),
                            auctionSpec._reserveStake.mul( new BN('1') ),
                            auctionSpec._reserveStake.mul( new BN('1') )]
                let bidders = accounts.slice(1, 1 + bids.length)
                let [enteredBids, _] = await addNBids(instance, auctionSpec, bidders, {amounts: bids})

                let expectedTotalSlotsSold = '6'
                let expectedSlotsWon = ['2', '2', '1', '1']
                let trueFinalPrice = auctionSpec._reserveStake

                await advanceToPrice(instance, trueFinalPrice, auctionSpec._reserveStake)
                assert.ok(await instance.isBiddingPhase.call())
                await expectRevert(instance.finaliseAuction( trueFinalPrice ), "finalPrice does not clear auction")

                await advanceToBlock(auctionSpec._auctionEnd)
                await duplicateTests(auctionSpec, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon)
            });
            it("should allow to withdraw entered bid - reserveStake and keep reserveStake as lockup if auction does not clear and auctionEnd has passed", async () => {
                let nBids = 4
                let bids = new Array(nBids).fill( new BN('0') )
                let bidders = accounts.slice(1, 1 + bids.length)

                // Forward to phase where price = reserveStake to ensure it does not sell out through declining price
                await advanceToBlock(auctionSpec._auctionEnd - AuctionConstants._reserve_price_duration)
                let [enteredBids, _] = await addNBids(instance, auctionSpec, bidders, {amounts: bids})

                let expectedTotalSlotsSold = '4'
                let expectedSlotsWon = ['1', '1', '1', '1']
                let trueFinalPrice = auctionSpec._reserveStake

                await advanceToBlock(auctionSpec._auctionEnd)
                await duplicateTests(auctionSpec, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon)

                let stakers = await instance.getFinalStakers.call()
                assert.deepEqual(stakers.slice(0, nBids), bidders)
                assert.equal(stakers[nBids], constants.ZERO_ADDRESS, "Unfilled slots not zero")

                let [__, depositsPost, balancesPre, balancesPost, balanceDiffs] = await withdrawSelfStake_checkBalances(instance, token, bidders)
                let expextedWithdrawals = []
                for (i=0; i<nBids; i++){
                    expextedWithdrawals.push(enteredBids[i].amount.sub(auctionSpec._reserveStake).toString())
                }
                assert.deepEqual(depositsPost, new Array(nBids).fill(auctionSpec._reserveStake.toString()))
                assert.deepEqual(balanceDiffs, expextedWithdrawals)
            });
            it("should allow to withdraw entered bid - finalPrice and keep finalPrice as lockup if auction does clear and auctionEnd has passed", async () => {
                let nBids = 4
                let bids = new Array(nBids).fill( new BN('0') )
                let bidders = accounts.slice(1, 1 + bids.length)

                let [enteredBids, _] = await addNBids(instance, auctionSpec, bidders, {amounts: bids})

                let expectedTotalSlotsSold = '8'
                let expectedSlotsWon = ['2', '2', '2', '2']
                let trueFinalPrice = calcTrueFinalPrice(auctionSpec, enteredBids, auctionSpec._reserveStake)

                await advanceToBlock(auctionSpec._auctionEnd)
                await duplicateTests(auctionSpec, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon)

                let stakers = await instance.getFinalStakers.call()
                assert.deepEqual(stakers.slice(0, nBids), bidders)
                assert.equal(stakers[nBids], constants.ZERO_ADDRESS, "Unfilled slots not zero")

                let [__, depositsPost, balancesPre, balancesPost, balanceDiffs] = await withdrawSelfStake_checkBalances(instance, token, bidders)
                let expextedWithdrawals = []
                let expectedLockup = trueFinalPrice.mul( new BN('2') )
                for (i=0; i<nBids; i++){
                    expextedWithdrawals.push(enteredBids[i].amount.sub( expectedLockup ).toString())
                }
                assert.deepEqual(depositsPost, new Array(nBids).fill(expectedLockup.toString()))
                assert.deepEqual(balanceDiffs, expextedWithdrawals)
            });
        });
        describe("Auction setup 2", function() {
            let auctionSpecCopy = Object.assign({}, auctionSpec);
            auctionSpecCopy._slotsOnSale = 4
            // ensure slow decline
            auctionSpecCopy._duration = 250

            beforeEach(async function() {
                instance = await dutchStaking.new(token.address);
                await approveAll(auctionSpecCopy, token, instance, accounts);
                await initialiseAuction(auctionSpecCopy, token, instance);
            });

            it("should clear slots of stakers that drop out of slot allocation due to dropping price", async () => {
                let bids = [auctionSpecCopy._reserveStake.mul( new BN('2') ).mul( new BN('2') ),
                            auctionSpecCopy._reserveStake.mul( new BN('2') ),
                            auctionSpecCopy._reserveStake.mul( new BN('2') ),
                            auctionSpecCopy._reserveStake.mul( new BN('2') ).sub( new BN('1') ),  // win only 1 slot, but ensure that it does not yet update finalPrice to reserveStake
                           ]
                let bidders = accounts.slice(1, 1 + bids.length)
                let [enteredBids, _] = await addNBids(instance, auctionSpecCopy, bidders, {amounts: bids})

                let expectedTotalSlotsSold = '4'
                let expectedSlotsWon = ['2', '1', '1', '0']
                let trueFinalPrice = enteredBids[2].priceAtBid
                await duplicateTests(auctionSpecCopy, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon)
            });
        });
        describe("Auction setup 3", function() {
            let startInBlocks = 10

            beforeEach(async function() {
                instance = await dutchStaking.new(token.address);
                await approveAll(auctionSpec, token, instance, accounts);
                await initialiseAuction(auctionSpec, token, instance, {start: await web3.eth.getBlockNumber() + startInBlocks});
            });

            it("should not clear above startStake, even if it could", async () => {
                // priceAtBid value should still be startStake, thereby lowest clearing price should end up being startStake
                let nBids = 2
                let bids = new Array(nBids).fill( auctionSpec._startStake.mul( new BN('4')) )
                let bidders = accounts.slice(1, 1 + bids.length)

                let [enteredBids, _] = await addNBids(instance, auctionSpec, bidders, {amounts: bids})

                let expectedTotalSlotsSold = '8'
                let expectedSlotsWon = ['4', '4']
                let trueFinalPrice = auctionSpec._startStake

                await advanceToPrice(instance, trueFinalPrice, auctionSpec._reserveStake)
                await duplicateTests(auctionSpec, bidders, enteredBids, trueFinalPrice, expectedTotalSlotsSold, expectedSlotsWon)
            });
        });
    });

    describe("End lockup", function() {
        assert.equal(auctionSpec._slotsOnSale, 8)
        beforeEach(async function() {
            // redeploy token to ensure inital balance is correct
            token = await deployToken(auctionSpec, accounts, initialBalance);
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
        });


        describe("Bidding setup 1", function() {
            let enteredBids, trueFinalPrice
            let bidders = accounts.slice(1, 1 + auctionSpec._slotsOnSale)

            beforeEach(async function() {
                // clears the auction
                [enteredBids, _] = await addNBids(instance, auctionSpec, bidders)
                trueFinalPrice = calcTrueFinalPrice(auctionSpec, enteredBids)
            });

            it("should fail to end the lockup before the auction is finalised", async () => {
                await expectRevert(instance.endLockup(), "Auction not finalised yet or no auction to end");
            });
            it("should fail to end the lockup before time is over", async () => {
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: trueFinalPrice})
                await expectRevert(instance.endLockup(), "Lockup not over");
            });
            it("should fail to lift the lockup repeatedly", async () => {
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: trueFinalPrice})
                await advanceAndEndLockup(auctionSpec, instance)
                await expectRevert(instance.endLockup(), "Auction not finalised yet or no auction to end");
            });
            it("should still return isBiddingPhase = false, isFinalised = true, cleanup stakerSlots and stakers and subtract claimed auction rewards", async () => {
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: trueFinalPrice})
                let stakers = await instance.getFinalStakers.call()

                await advanceAndEndLockup(auctionSpec, instance)
                assert.isNotOk(await instance.isBiddingPhase())
                assert.ok(await instance.isFinalised())

                let stakersCleared = await instance.getFinalStakers.call()
                assert.deepEqual(stakersCleared, new Array(AuctionConstants._max_slots).fill(constants.ZERO_ADDRESS))
                let slotsCleared = await Promise.all(bidders.map(getSlots))
                assert.deepEqual(slotsCleared, new Array(bidders.length).fill('0'))

                let totalAuctionRewardsPost = await instance.totalAuctionRewards.call()
                expect(totalAuctionRewardsPost).to.be.bignumber.equal(auctionSpec._totalStakingRewards.sub( new BN(bidders.length.toString()).mul(auctionSpec._rewardPerSlot) ))
                //  in this case, the auction cleared
                expect(totalAuctionRewardsPost).to.be.bignumber.equal(auctionSpec._totalStakingRewards.mod( new BN(auctionSpec._slotsOnSale.toString()) ))
            });
            it("should allow withdraw of enteredBid + auction reward and set the deposits to zero", async () => {
                assert.ok(auctionSpec._rewardPerSlot > 0, "Test should have positive rewards")

                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: trueFinalPrice})
                // check auction status: everyone should have won 1 slots
                let expectedSlotsWon = new Array(enteredBids.length).fill('1')
                let slotsWon = await Promise.all(bidders.map(getSlots))
                assert.deepEqual(slotsWon, expectedSlotsWon)

                await advanceAndEndLockup(auctionSpec, instance)

                let [__, selfStakerDepositsPost, balancesPre, balancesPost, balanceDiffs] = await withdrawSelfStake_checkBalances(instance, token, bidders)

                let bidsPlusReward = enteredBids.map(bid => bid.amount.add(auctionSpec._rewardPerSlot).toString())

                assert.deepEqual(balanceDiffs, bidsPlusReward, "Withdrawals incorrect")
                assert.deepEqual(balancesPost, new Array(bidders.length).fill(initialBalance.add(auctionSpec._rewardPerSlot).toString()), "Final balances incorrect")
                assert.deepEqual(selfStakerDepositsPost, new Array(bidders.length).fill('0'), "Not all deposits set to 0")
            });
            it("should return calculateSelfStakeNeeded = 0", async () => {
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: trueFinalPrice})
                await advanceAndEndLockup(auctionSpec, instance)
                let lockups = bidders.map( async bidder => instance.calculateSelfStakeNeeded.call(bidder)
                                           .then(selfStake => selfStake.toString()) )
                assert.deepEqual(await Promise.all(lockups), new Array(enteredBids.length).fill('0'), "Lockups not 0")
            });
            it("should result in a zero contract balance", async () => {
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: trueFinalPrice})
                await advanceAndEndLockup(auctionSpec, instance)
                await instance.retrieveUndistributedAuctionRewards()

                for (i=0; i<bidders.length; i++){
                    await instance.withdrawSelfStake({from: bidders[i]})
                }
                expect(await token.balanceOf(instance.address)).to.be.bignumber.equal('0')
            });
            it("should not run into the vyper bug of external calls in if-clauses that evaluate false", async () => {
                // if the entered bids are identical, no topup was needed and the
                // if-clause in bid() evaluated false without running into a stack underflow
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: trueFinalPrice})
                await advanceAndEndLockup(auctionSpec, instance)
                await initialiseAuction(auctionSpec, token, instance);

                // set allowance to zero for all bidders. Meaning the bids can only succeed if they don't require any topup
                // Meaning the if clause topup > 0 evaluated false without running into a stack underflow
                await approveAll(auctionSpec, token, instance, bidders, 0);
                let [enteredBids2, _] = await addNBids(instance, auctionSpec, bidders)
            });
        });
        describe("Bidding setup 2", function() {
            let enteredBids, trueFinalPrice
            let nBids = 4
            let bids = new Array(nBids).fill( new BN('0') )
            let bidders = accounts.slice(1, 1 + bids.length)

            beforeEach(async function() {
                [enteredBids, _] = await addNBids(instance, auctionSpec, bidders, {amounts: bids})
                trueFinalPrice = calcTrueFinalPrice(auctionSpec, enteredBids)
            });

            it("should distributed slotsWon * rewardPerSlot in rewards to each auction winner", async () => {
                let expectedTotalSlotsSold = '8'
                let expectedSlotsWon = ['2', '2', '2', '2']

                assert.ok(auctionSpec._rewardPerSlot > 0, "Test should have positive rewards")
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: trueFinalPrice})
                // check auction status
                expect((await instance.auction.call()).finalPrice).to.be.bignumber.equal(trueFinalPrice)
                expect((await instance.auction.call()).slotsSold).to.be.bignumber.equal(expectedTotalSlotsSold)
                assert.ok(instance.isFinalised.call())
                let slotsWon = await Promise.all(bidders.map(getSlots))
                assert.deepEqual(slotsWon, expectedSlotsWon)

                await advanceAndEndLockup(auctionSpec, instance)
                let [__, selfStakerDepositsPost, balancesPre, balancesPost, balanceDiffs] = await withdrawSelfStake_checkBalances(instance, token, bidders)

                let expReward = auctionSpec._rewardPerSlot.mul(new BN('2'))
                let bidsPlusReward = enteredBids.map(bid => bid.amount.add(expReward).toString())

                assert.deepEqual(balanceDiffs, bidsPlusReward, "Withdrawals incorrect")
                assert.deepEqual(balancesPost, new Array(bidders.length).fill(initialBalance.add(expReward).toString()), "Final balances incorrect")
                assert.deepEqual(selfStakerDepositsPost, new Array(bidders.length).fill('0'), "Not all deposits set to 0")
            });
        });
    });

    describe("Retrieve unclaimed auction rewards", function() {
        let nBids = 3
        let bidders = accounts.slice(1, 1 + nBids)
        let enteredBids

        beforeEach(async function() {
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
            // does not clear the auction
            await advanceToBlock(auctionSpec._auctionEnd - AuctionConstants._reserve_price_duration);
            [enteredBids, _] = await addNBids(instance, auctionSpec, bidders)
        });

        it("should fail to withdraw unclaimed auction rewards before lockup ended", async () => {
            await expectRevert.unspecified(instance.retrieveUndistributedAuctionRewards({from: auctionSpec._owner}))
        });
        it("should allow to withdraw unclaimed auction rewards after lockup ended", async () => {
            await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: auctionSpec._reserveStake})

            expUnclaimed = auctionSpec._totalStakingRewards.sub( new BN(nBids.toString()).mul(auctionSpec._rewardPerSlot) )
            await advanceAndEndLockup(auctionSpec, instance)

            let remainingAuctionRewards = await instance.totalAuctionRewards.call()
            expect(remainingAuctionRewards).to.be.bignumber.equal(expUnclaimed)

            let balancePre = await token.balanceOf(auctionSpec._owner)
            await instance.retrieveUndistributedAuctionRewards({from: auctionSpec._owner})
            let balancePost = await token.balanceOf(auctionSpec._owner)
            expect(balancePost.sub(balancePre)).to.be.bignumber.equal(expUnclaimed)

            expect(await instance.totalAuctionRewards.call()).to.be.bignumber.equal('0')
        });
    });

    describe("Repeated auctions", function() {
        let auctionSpec1 = Object.assign({}, auctionSpec);
        let auctionSpec2 = Object.assign({}, auctionSpec);
        auctionSpec2._AID = 2
        auctionSpec2._reserveStake = new BN('50')  // lower than auctionSpec1._reserveStake
        assert.ok(auctionSpec2._reserveStake.lt(auctionSpec1._reserveStake), "Bad second auction setup")

        auctionSpec1.nBids = 5
        auctionSpec2.nBids = 6
        auctionSpec1.bidders = accounts.slice(1, auctionSpec1.nBids + 1)
        auctionSpec2.bidders = accounts.slice(1, auctionSpec2.nBids + 1)
        assert.ok(auctionSpec2.nBids > auctionSpec1.nBids, "Bad second auction setup")
        let enteredBids1, slotsWon1 = []
        const expectedSlotsWon1 = ['0', '2', '2', '2', '1', '1', '0', '0', '0', '0']
        const expectedSlotsWon2 = ['0', '2', '2', '1', '1', '1', '1', '0', '0', '0']
        // Naming:
        //      StakerBoth: staker in auction 1 and in auction 2
        //      StakerAID2: not a staker in auction 1, staker in auction 2
        let stakerBoth = auctionSpec1.bidders[0]
        let stakerAID2 = auctionSpec2.bidders[auctionSpec2.nBids - 1]

        // Initialise, finalize and endLockup of AID 1, initialise AID 2
        beforeEach(async function() {
            // redeploy token to ensure inital balance is correct
            token = await deployToken(auctionSpec1, accounts, initialBalance);
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec1, token, instance, accounts);

            // AID 1
            await initialiseAuction(auctionSpec1, token, instance);
            [enteredBids1, _] = await addNBids(instance, auctionSpec1, auctionSpec1.bidders)

            await advanceAndFinaliseAuction(auctionSpec1, instance, {enteredBids: enteredBids1})
            auctionSpec1.finalStake = (await instance.auction.call()).finalPrice
            slotsWon1 = await Promise.all(accounts.map(getSlots))
            assert.deepEqual(slotsWon1, expectedSlotsWon1)
            await advanceAndEndLockup(auctionSpec1, instance)
            // O/w the rewards per slot of AID 2 will include undistributed rewards from AID 1
            await instance.retrieveUndistributedAuctionRewards({from: auctionSpec._owner})

            // AID 2
            await initialiseAuction(auctionSpec2, token, instance);
            expect(await instance.currentAID.call()).to.be.bignumber.equal(auctionSpec2._AID.toString())
        });

        it("should fail to send a too low deposit from non-staker in auction 1, but succeed for staker in auction 1", async () => {
            let existingDeposit = await instance.selfStakerDeposits.call(stakerBoth)
            let existingDepositStakerAID2 = await instance.selfStakerDeposits.call(stakerAID2)
            expect(existingDeposit).to.be.bignumber.gt( new BN('0') )
            expect(existingDepositStakerAID2).to.be.bignumber.equal('0')

            expect(await instance.getCurrentPrice.call()).to.be.bignumber.lte(existingDeposit)

            await token.approve(instance.address, 0, {from: stakerBoth})
            await token.approve(instance.address, 0, {from: stakerAID2})

            await instance.bid.call(0, {from: stakerBoth})
            await expectRevert.unspecified(instance.bid.call(0, {from: stakerAID2}));
        });
        it("should still allow the withdrawal of all stake if no bid in auction 2 is made", async () => {
            let bidderAID1 = auctionSpec1.bidders[0]
            let existingDeposit = await instance.selfStakerDeposits.call(bidderAID1)
            let [_, __, ___, ____, balanceDiffs] = await withdrawSelfStake_checkBalances(instance, token, [bidderAID1])

            assert.equal(balanceDiffs[0], existingDeposit.toString())
        });
        it("should only transfer the difference of bid2 - existing deposits to the contract", async () => {
            let lateBidderAID1 = auctionSpec1.bidders[auctionSpec1.nBids - 1]
            let existingDeposit = await instance.selfStakerDeposits.call(lateBidderAID1)
            let balancePre = await token.balanceOf.call(lateBidderAID1)

            await instance.bid(0, {from: lateBidderAID1})
            // this will be the price at which the bid has been made
            let currentPrice = await instance.getCurrentPrice.call()
            let topupNeeded = currentPrice.sub(existingDeposit)
            expect(topupNeeded).to.be.bignumber.gt('0')
            let balancePost = await token.balanceOf.call(lateBidderAID1)

            expect(balancePre.sub(balancePost)).to.be.bignumber.equal(topupNeeded)
        });
        it("should require a lockup of slotsWon2 * finalStake2 for bidders in the second auction and 0 for others", async () => {
            let [enteredBids2, _] = await addNBids(instance, auctionSpec2, auctionSpec2.bidders)
            await advanceAndFinaliseAuction(auctionSpec2, instance, {enteredBids: enteredBids2})

            let finalStake2 = await instance.getCurrentPrice.call()

            let slotsWon2 = await Promise.all(accounts.map(getSlots))
            assert.deepEqual(slotsWon2, expectedSlotsWon2)

            let lockups = [], expLockups = []
            for (i=0; i<accounts.length; i++){
                // let slotsWon = await instance.getFinalStakerSlots.call(accounts[i])
                let lockup = await instance.calculateSelfStakeNeeded.call(accounts[i])
                lockups.push(lockup.toString())

                let expLockup = '0'
                if (auctionSpec2.bidders.includes(accounts[i])) {
                    expLockup = finalStake2.mul( new BN(expectedSlotsWon2[i]) ).toString()
                }
                expLockups.push(expLockup)
            }
            assert.deepEqual(lockups, expLockups)
        });
        it("should repay everything plus rewards of the auctions they participated in", async () => {
            let [enteredBids2, _] = await addNBids(instance, auctionSpec2, auctionSpec2.bidders)

            let expectedBalances = []
            for (i=0; i<accounts.length; i++){
                let profit = new BN('0')
                if (auctionSpec1.bidders.includes(accounts[i])){
                    profit = profit.add( auctionSpec1._rewardPerSlot.mul( new BN(expectedSlotsWon1[i]) ) )
                }
                if (auctionSpec2.bidders.includes(accounts[i])){
                    // let slotsWon = await instance.getFinalStakerSlots.call(accounts[i])
                    profit = profit.add( auctionSpec2._rewardPerSlot.mul( new BN(expectedSlotsWon2[i]) ) )
                }
                expectedBalances.push(initialBalance.add(profit).toString())
            }

            await advanceAndFinaliseAuction(auctionSpec2, instance, {enteredBids: enteredBids2})
            await advanceAndEndLockup(auctionSpec2, instance)
            await instance.retrieveUndistributedAuctionRewards()

            await withdrawSelfStake_checkBalances(instance, token, accounts)
            let [contractBalance, accountBalances, __] = await getTokenBalances(token, instance, accounts)

            // ignore balance of token owner
            assert.deepEqual(accountBalances.slice(1), expectedBalances.slice(1), "Final balances incorrect")
            assert.equal(contractBalance, '0', "Final contract balance not 0")
        });
    });

    describe("abortAuction", function() {
        let enteredBids
        let expectedSlotsWon = ['0', '2', '1', '1', '1', '1', '1', '1', '0', '0']
        let bidders = accounts.slice(1, 8)
        let expectedTotalSlotsSold = '8'

        beforeEach(async function() {
            // redeploy token to ensure inital balance is correct
            token = await deployToken(auctionSpec, accounts, initialBalance);
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
        });

        it("should have nothing to abort if run without an auction", async () => {
            await expectRevert(instance.abortAuction(false, {from: auctionSpec._owner}), "No lockup to end")
        });
        it("should prohibit anyone except the owner to call it", async () => {
            await expectRevert(instance.abortAuction(false, {from: accounts[5]}), "Owner only")
        });
        it("should emit an AuctionAborted event, clear the auction parameters if run after auction initialisation and allow to initialise a new auction", async () => {
            await initialiseAuction(auctionSpec, token, instance);
            let receipt = await instance.abortAuction(false, {from: auctionSpec._owner})
            await expectEvent.inLogs(receipt.logs, "AuctionAborted", {AID: new BN(auctionSpec._AID),
                                                                      rewardsPaid: false})

            expect((await instance.auction.call()).start).to.be.bignumber.equal('0')
            expect((await instance.auction.call()).lockupEnd).to.be.bignumber.equal('0')
            expect((await instance.auction.call()).slotsSold).to.be.bignumber.equal('0')
            expect((await instance.auction.call()).rewardPerSlot).to.be.bignumber.equal('0')

            let auctionSpecCopy = Object.assign({}, auctionSpec);
            auctionSpecCopy._AID = auctionSpec._AID + 1
            await initialiseAuction(auctionSpecCopy, token, instance);
        });
        it("should clear stakers and staker slots if bids have been made", async () => {
            await initialiseAuction(auctionSpec, token, instance);
            [enteredBids, _] = await addNBids(instance, auctionSpec, bidders)

            await instance.abortAuction(false, {from: auctionSpec._owner})

            let stakers = await instance.getFinalStakers.call()
            assert.deepEqual(stakers, new Array(AuctionConstants._max_slots).fill(constants.ZERO_ADDRESS))

            await withdrawSelfStake_checkBalances(instance, token, accounts)
            let [contractBalance, accountBalances, __] = await getTokenBalances(token, instance, accounts)

            // ignore balance of token owner
            assert.deepEqual(accountBalances.slice(1), new Array(accounts.length - 1).fill(initialBalance.toString()), "Final balances incorrect")
            assert.equal(contractBalance, auctionSpec._totalStakingRewards.toString(), "Final contract balance not equal loaded rewards")
        });
        it("should be callable during lockup phase and clear the auction & staker states", async () => {
            await initialiseAuction(auctionSpec, token, instance);
            [enteredBids, _] = await addNBids(instance, auctionSpec, bidders)
            await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids})
            assert.ok(await instance.isFinalised.call())

            await instance.abortAuction(false, {from: auctionSpec._owner})

            let stakers = await instance.getFinalStakers.call()
            assert.deepEqual(stakers, new Array(AuctionConstants._max_slots).fill(constants.ZERO_ADDRESS))

            await withdrawSelfStake_checkBalances(instance, token, accounts)
            let [contractBalance, accountBalances, __] = await getTokenBalances(token, instance, accounts)

            // ignore balance of token owner
            assert.deepEqual(accountBalances.slice(1), new Array(accounts.length - 1).fill(initialBalance.toString()), "Final balances incorrect")
            assert.equal(contractBalance, auctionSpec._totalStakingRewards.toString(), "Final contract balance not equal loaded rewards")
        });
        it("should distribute rewards to bidders if payoutRewards=True", async () => {
            await initialiseAuction(auctionSpec, token, instance);
            [enteredBids, _] = await addNBids(instance, auctionSpec, bidders)
            await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids})
            assert.ok(await instance.isFinalised.call())

            await instance.abortAuction(true, {from: auctionSpec._owner})

            let stakers = await instance.getFinalStakers.call()
            assert.deepEqual(stakers, new Array(AuctionConstants._max_slots).fill(constants.ZERO_ADDRESS))

            await withdrawSelfStake_checkBalances(instance, token, accounts)
            let [contractBalance, accountBalances, __] = await getTokenBalances(token, instance, accounts)

            let expectedBalances = []
            for (i=0; i<accounts.length; i++){
                let profit = auctionSpec._rewardPerSlot.mul( new BN(expectedSlotsWon[i]) )
                expectedBalances.push(initialBalance.add(profit).toString())
            }

            // ignore balance of token owner
            assert.deepEqual(accountBalances.slice(1), expectedBalances.slice(1), "Final balances incorrect")

            let expClaimedSlotsRewards = auctionSpec._rewardPerSlot.mul( new BN(expectedTotalSlotsSold) )
            assert.equal(contractBalance, auctionSpec._totalStakingRewards.sub(expClaimedSlotsRewards).toString(), "Final contract balance not equal loaded rewards")
            let remainingAuctionRewards = await instance.totalAuctionRewards.call()
            assert.equal(remainingAuctionRewards.toString(), auctionSpec._totalStakingRewards.sub(expClaimedSlotsRewards).toString(), "Final contract balance not equal loaded rewards")
        });
    });

    describe("deleteContract", function() {
        let enteredBids

        beforeEach(async function() {
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
            [enteredBids, _] = await addNBids(instance, auctionSpec, accounts, {N: auctionSpec._slotsOnSale - 1})
        });

        it("should fail to delete while auction is running", async () => {
            await expectRevert.unspecified(instance.deleteContract({from: auctionSpec._owner}))
        });
        it("should fail to delete with an auction in lockup phase", async () => {
            await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids})
            await expectRevert.unspecified(instance.deleteContract({from: auctionSpec._owner}))
        });
        it("should set earliestDelete upon lockupEnd, be able to delete it after an additional DELETE_PERIOD and send balance to owner", async () => {
            await advanceAndFinaliseAuction(auctionSpec, instance, {enteredBids: enteredBids})
            await advanceAndEndLockup(auctionSpec, instance)

            let currentBlockNumber = await web3.eth.getBlockNumber()
            let currentBlock = await web3.eth.getBlock(currentBlockNumber);
            let earliestDelete = await instance.earliestDelete.call()

            //console.log('current block time = ', (await time.latest()).toString())
            //console.log('earliest delete = ', earliestDelete.toString());
            //console.log('current block time = ', (await time.latest()).toString())

            assert.equal(earliestDelete.toNumber(), currentBlock.timestamp + AuctionConstants._delete_period)
            //await sleep(3000)
            //console.log('current block time (after sleep 3000 ms)= ', (await time.latest()).toString())
            
            new_earliest_delete = earliestDelete.sub(new BN('100')) 
            //console.log('calculated earlier delete = ', new_earliest_delete.toString())

            await time.increaseTo(new_earliest_delete)
            //console.log('1 current block time = ', (await time.latest()).toString())
            //await sleep(10000)

            await expectRevert(instance.deleteContract.call({from: auctionSpec._owner}), "earliestDelete not reached")
            //console.log('2 current block time = ', (await time.latest()).toString())

            await time.increaseTo(earliestDelete)
            //await sleep(10000)
            let balanceOwnerPre = await token.balanceOf(auctionSpec._owner)
            let balanceContract = await token.balanceOf(instance.address)

            await instance.deleteContract({from: auctionSpec._owner})
            //console.log('3 current block time = ', (await time.latest()).toString())

            let balanceOwnerPost = await token.balanceOf(auctionSpec._owner)

            expect(balanceOwnerPost.sub(balanceOwnerPre)).to.be.bignumber.equal(balanceContract)
        });
    });

    describe("virtual tokens", function() {
        let poolSpec = {
            _maxStake : auctionSpec._reserveStake,
            _totalReward : new BN('500').mul(FET_ERC20.multiplier),
            _owner : accounts[0]
        }
        poolSpec.rewardPerTok = calc_rewardPerTok(poolSpec)

        let virtTokenHolderAddr = accounts[1]
        let limit = FET_ERC20._initialSupply

        beforeEach(async function() {
            // redeploy token to ensure inital balance is correct
            token = await deployToken(auctionSpec, accounts, initialBalance);
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
        });

        describe("owner functions", function() {
            it("should allow the owner to define virtTokenHolder addresses", async () => {
                assert.isNotOk((await instance.virtTokenHolders.call(virtTokenHolderAddr)).isHolder)
                await instance.setVirtTokenHolder(virtTokenHolderAddr, true, limit, true)
                assert.ok((await instance.virtTokenHolders.call(virtTokenHolderAddr)).isHolder)
                await instance.setVirtTokenHolder(virtTokenHolderAddr, false, limit, true)
                assert.isNotOk((await instance.virtTokenHolders.call(virtTokenHolderAddr)).isHolder)
            });
            it("should allow the owner to set the virtualTokenLimit", async () => {
                await instance.setVirtTokenHolder(virtTokenHolderAddr, true, limit, true)

                expect((await instance.virtTokenHolders.call(virtTokenHolderAddr)).limit).to.be.bignumber.equal(limit)

                await instance.setVirtTokenLimit(virtTokenHolderAddr, 10)
                expect((await instance.virtTokenHolders.call(virtTokenHolderAddr)).limit).to.be.bignumber.equal('10')
            });
            it("should restrict access to the functions to the owner", async () => {
                let notOwner = accounts[1]

                await expectRevert(instance.setVirtTokenHolder(virtTokenHolderAddr, true, limit, true, {from: notOwner}), "Owner only")
                await expectRevert(instance.setVirtTokenLimit(virtTokenHolderAddr, 10, {from: notOwner}), "Owner only")
            });
            it("should not allow virtTokenHolder addresses to register pools or take part in them", async () => {
                let pledge = new BN('10')
                await instance.setVirtTokenHolder(virtTokenHolderAddr, true, limit, true)

                await registerWalletPool(token, instance, poolSpec, auctionSpec._AID)
                await expectRevert(instance.pledgeStake(auctionSpec._AID, poolSpec._owner, pledge, {from: virtTokenHolderAddr}), "Not allowed for virtTokenHolders")

                let poolSpec1 = Object.assign({}, poolSpec);
                poolSpec1._owner = virtTokenHolderAddr
                await expectRevert(registerWalletPool(token, instance, poolSpec1, auctionSpec._AID, {from: virtTokenHolderAddr}), "Not allowed for virtTokenHolders")
            });
        });
        describe("usage", function() {
            let expectedSlots = new BN('3')
            let amount = auctionSpec._reserveStake.mul(expectedSlots)
            let expectedReward = auctionSpec._rewardPerSlot.mul(expectedSlots)

            beforeEach(async function() {
                await instance.setVirtTokenHolder(virtTokenHolderAddr, true, limit, true)
            });

            it("should allow virtTokenHolder addresses to make a bid without transfering tokens", async () => {
                let balancePre = await token.balanceOf.call(virtTokenHolderAddr)
                await advanceToPrice(instance, amount, auctionSpec._reserveStake)
                await instance.bid(amount, {from: virtTokenHolderAddr})
                let balancePost = await token.balanceOf.call(virtTokenHolderAddr)
                expect(balancePost).to.be.bignumber.equal(balancePre)
                expect(await instance.selfStakerDeposits.call(virtTokenHolderAddr)).to.be.bignumber.equal(amount)

                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: auctionSpec._reserveStake})
                expect(await instance.getFinalStakerSlots.call(virtTokenHolderAddr)).to.be.bignumber.equal(expectedSlots)
            });

            it("should distribute rewards to the dedicated storage and not to selfStakerDeposits, allow to withdraw only them and reset selfStakerDeposits at endLockup", async () => {
                await advanceToPrice(instance, amount, auctionSpec._reserveStake)
                await instance.bid(amount, {from: virtTokenHolderAddr})
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: auctionSpec._reserveStake})
                await advanceAndEndLockup(auctionSpec, instance)

                expect((await instance.virtTokenHolders.call(virtTokenHolderAddr)).rewards).to.be.bignumber.equal(expectedReward)
                expect(await instance.selfStakerDeposits.call(virtTokenHolderAddr)).to.be.bignumber.equal('0')

                await instance.withdrawSelfStake({from: virtTokenHolderAddr})
                expect(await token.balanceOf(virtTokenHolderAddr)).to.be.bignumber.equal(initialBalance.add(expectedReward))
                expect((await instance.virtTokenHolders.call(virtTokenHolderAddr)).rewards).to.be.bignumber.equal('0')
            });
            it("should not allow virtTokenHolder addresses to bid more than virtualTokenLimit, but should allow others to do so", async () => {
                let newLimit = amount.sub( new BN('1') )
                await instance.setVirtTokenLimit(virtTokenHolderAddr, newLimit)

                await advanceToPrice(instance, amount, auctionSpec._reserveStake)
                await expectRevert(instance.bid(amount, {from: virtTokenHolderAddr}), "Virtual tokens above limit")
                await instance.bid(amount, {from: accounts[0]})
            });
            it("should reset the selfStakerDeposits if auction is aborted / not allow to bid more than the limit in following auctions", async () => {
                let singleSlotAmount = auctionSpec._reserveStake
                let expectedRewardAuction1 = auctionSpec._rewardPerSlot
                let expectedRewardBothAuctions = auctionSpec._rewardPerSlot.mul( new BN('2') )
                let auctionSpec2 = Object.assign({}, auctionSpec);
                auctionSpec2._AID = 2
                let payoutRewards = true

                await advanceToPrice(instance, singleSlotAmount, auctionSpec._reserveStake)
                await instance.bid(singleSlotAmount, {from: virtTokenHolderAddr})
                expect(await instance.selfStakerDeposits.call(virtTokenHolderAddr)).to.be.bignumber.equal(singleSlotAmount)
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: auctionSpec._reserveStake})

                await instance.abortAuction(payoutRewards)
                expect(await instance.selfStakerDeposits.call(virtTokenHolderAddr)).to.be.bignumber.equal('0')
                // ensure second auction has the same rewards per slot for simplicity
                await instance.retrieveUndistributedAuctionRewards({from: auctionSpec._owner})

                await initialiseAuction(auctionSpec2, token, instance);

                await advanceToPrice(instance, singleSlotAmount, auctionSpec2._reserveStake)
                await instance.bid(singleSlotAmount, {from: virtTokenHolderAddr})
                expect(await instance.selfStakerDeposits.call(virtTokenHolderAddr)).to.be.bignumber.equal(singleSlotAmount)
                await advanceAndFinaliseAuction(auctionSpec2, instance, {finalPrice: auctionSpec2._reserveStake})
                await advanceAndEndLockup(auctionSpec2, instance)

                await instance.withdrawSelfStake({from: virtTokenHolderAddr})
                expect(await token.balanceOf(virtTokenHolderAddr)).to.be.bignumber.equal(initialBalance.add(expectedRewardBothAuctions))
                expect(await instance.selfStakerDeposits.call(virtTokenHolderAddr)).to.be.bignumber.equal('0')
            });
        });

        describe("remove isVirtTokenHolder property", function() {
            let expectedSlots = new BN('3')
            let amount = auctionSpec._reserveStake.mul(expectedSlots)
            let expectedReward = auctionSpec._rewardPerSlot.mul(expectedSlots)

            beforeEach(async function() {
                expect(await instance.selfStakerDeposits.call(virtTokenHolderAddr)).to.be.bignumber.equal('0')
                await instance.setVirtTokenHolder(virtTokenHolderAddr, true, limit, true)
                await advanceToPrice(instance, amount, auctionSpec._reserveStake)
                await instance.bid(amount, {from: virtTokenHolderAddr})
                await advanceAndFinaliseAuction(auctionSpec, instance, {finalPrice: auctionSpec._reserveStake})
                await advanceAndEndLockup(auctionSpec, instance)
                await instance.retrieveUndistributedAuctionRewards({from: auctionSpec._owner})
                expect((await instance.virtTokenHolders.call(virtTokenHolderAddr)).rewards).to.be.bignumber.equal(expectedReward)
            });

            it("should allow to preserve rewards when removing the isVirtTokenHolder property", async () => {
                await instance.setVirtTokenHolder(virtTokenHolderAddr, false, limit, true)
                expect((await instance.virtTokenHolders.call(virtTokenHolderAddr)).rewards).to.be.bignumber.equal('0')
                expect(await instance.selfStakerDeposits.call(virtTokenHolderAddr)).to.be.bignumber.equal(expectedReward)
            });
            it("should allow to reclaim rewards when removing the isVirtTokenHolder property", async () => {
                await instance.setVirtTokenHolder(virtTokenHolderAddr, false, limit, false)
                expect((await instance.virtTokenHolders.call(virtTokenHolderAddr)).rewards).to.be.bignumber.equal('0')
                expect(await instance.selfStakerDeposits.call(virtTokenHolderAddr)).to.be.bignumber.equal('0')
                expect(await instance.totalAuctionRewards.call()).to.be.bignumber.equal(expectedReward)
            });
        });
    });
});