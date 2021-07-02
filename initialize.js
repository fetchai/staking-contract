const { BN, expectEvent, expectRevert } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const dutchStaking = artifacts.require("dutchStaking");

const { deployToken } = require('./utility/utils');
const { AuctionConstants, FET_ERC20 } = require("./utility/constants.js")


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

    //console.log("Owner Address", accounts[0])

    // div returns integer division (i.e. floor())
    auctionSpec._rewardPerSlot = auctionSpec._totalStakingRewards.div( new BN(auctionSpec._slotsOnSale.toString()) )
    // integer ceil()
    let expDeclinePerBlock = (auctionSpec._startStake
                              .sub(auctionSpec._reserveStake)
                              .add( new BN((auctionSpec._duration - 1).toString()) )
                              .div( new BN(auctionSpec._duration.toString()) ))

    auctionSpec.declinePerBlock = expDeclinePerBlock

    before(async () => {
        token = await deployToken(auctionSpec, accounts, initialBalance);

    });

    describe("FET token", function() {
        it("should result in a totalSupply of 1152997575000000000000000000, matching the deployed ERC20 on etherscan", async () => {
            expect( await token.decimals()).to.be.bignumber.equal('18')
            expect( await token.totalSupply()).to.be.bignumber.equal('1152997575000000000000000000')
        });
        it("should release the token", async () => {
            expect(await token.released()).to.be.true
        });
    });

    describe("Initialise an auction", function() {
        before(async () => {
            instance = await dutchStaking.new(token.address);
            //console.log("Token Address", token.address)
        });
        it("should initialise the auction, add auction rewards and return isBiddingPhase = true", async () => {
            let currentAIDInit = await instance.currentAID.call()
            expect(currentAIDInit).to.be.bignumber.equal('0')

            //console.log("Auction Address", instance.address)
            //console.log("addr", instance.address)
            //console.log("amount", auctionSpec._totalStakingRewards)
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
    });

    describe("Bidding", function() {
        let bidder = accounts[0]

        beforeEach(async function() {
            instance = await dutchStaking.new(token.address);
            await approveAll(auctionSpec, token, instance, accounts);
            await initialiseAuction(auctionSpec, token, instance);
            assert.ok(await instance.isBiddingPhase(), "Bidding phase should be open")
        });
        //console.log("bidder", bidder)
    });
});
