const utils = require('./utils');

module.exports.getFinalStakers = async (req, res) => {
	try {
		return await utils.getFinalStakers()
		
	} catch(err) {
		console.log(err)
	}
}
module.exports.getERC20Address = async (req, res) => {
	try {
		return await utils.getERC20Address()

	} catch(err) {
		console.log(err)
	}
}
module.exports.getCurrentPrice = async (req, res) => {
	try {
		return await utils.getCurrentPrice()

	} catch(err) {
		console.log(err)
	}
}
module.exports.retrieveUndistributedAuctionRewards = async (req, res) => {
	try {
		return await utils.retrieveUndistributedAuctionRewards()

	} catch(err) {
		console.log(err)
	}
}
module.exports.bid = async (req, res) => {
	try {
		var idInfo = req.body;
		var bidder_address = idInfo.bidder_address;
		var amount = idInfo.amount;
		return await utils.bid(bidder_address, amount)

	} catch(err) {
		console.log(err)
	}
}
module.exports.finaliseAuction = async (req, res) => {
	try {
		var idInfo = req.body;
		var finalPrice = idInfo.finalPrice;
		return await utils.finaliseAuction(finalPrice)

	} catch(err) {
		console.log(err)
	}
}
module.exports.endLockup = async (req, res) => {
	try {
		return await utils.endLockup()

	} catch(err) {
		console.log(err)
	}
}
module.exports.abortAuction = async (req, res) => {
	try {
		var idInfo = req.body;
		var payoutRewards = idInfo.payoutRewards;
		return await utils.abortAuction(payoutRewards)

	} catch(err) {
		console.log(err)
	}
}
module.exports.withdrawSelfStake = async (req, res) => {
	try {
		return await utils.withdrawSelfStake()

	} catch(err) {
		console.log(err)
	}
}

module.exports.withdrawPledgedStake = async (req, res) => {
	try {
		return await utils.withdrawPledgedStake()

	} catch(err) {
		console.log(err)
	}
}

module.exports.deleteContract = async (req, res) => {
	try {
		return await utils.deleteContract()

	} catch(err) {
		console.log(err)
	}
}

module.exports.getDenominator = async (req, res) => {
	try {
		return await utils.getDenominator()

	} catch(err) {
		console.log(err)
	}
}
module.exports.getFinalStakerSlots = async (req, res) => {
	try {
		var idInfo = req.body;
		var staker = idInfo.staker;
		return await utils.getFinalStakerSlots(staker)

	} catch(err) {
		console.log(err)
	}
}
module.exports.getFinalSlotsSold = async (req, res) => {
	try {
		return await utils.getFinalSlotsSold()

	} catch(err) {
		console.log(err)
	}
}
module.exports.isBiddingPhase = async (req, res) => {
	try {
		return await utils.isBiddingPhase()

	} catch(err) {
		console.log(err)
	}
}
module.exports.isFinalised = async (req, res) => {
	try {
		return await utils.isFinalised()

	} catch(err) {
		console.log(err)
	}
}
module.exports.calculateSelfStakeNeeded = async (req, res) => {
	try {
		var idInfo = req.body;
		var address = idInfo.address;
		return await utils.calculateSelfStakeNeeded(address)

	} catch(err) {
		console.log(err)
	}
}
module.exports.owner = async (req, res) => {
	try {
		return await utils.owner()

	} catch(err) {
		console.log(err)
	}
}
module.exports.earliestDelete = async (req, res) => {
	try {
		return await utils.earliestDelete()

	} catch(err) {
		console.log(err)
	}
}
module.exports.poolDeposits = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.poolDeposits(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.pledges__amount = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.pledges__amount(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.pledges__AID = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.pledges__AID(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.pledges__pool = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.pledges__pool(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.selfStakerDeposits = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.selfStakerDeposits(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.priceAtBid = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.priceAtBid(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.registeredPools__remainingReward = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.registeredPools__remainingReward(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.registeredPools__rewardPerTok = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.registeredPools__rewardPerTok(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.registeredPools__AID = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.registeredPools__AID(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.currentAID = async (req, res) => {
	try {
		return await utils.currentAID()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__finalPrice = async (req, res) => {
	try {
		return await utils.auction__finalPrice()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__finalPrice = async (req, res) => {
	try {
		return await utils.auction__finalPrice()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__lockupEnd = async (req, res) => {
	try {
		return await utils.auction__lockupEnd()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__slotsSold = async (req, res) => {
	try {
		return await utils.auction__slotsSold()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__start = async (req, res) => {
	try {
		return await utils.auction__start()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__end = async (req, res) => {
	try {
		return await utils.auction__end()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__startStake = async (req, res) => {
	try {
		return await utils.auction__startStake()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__reserveStake = async (req, res) => {
	try {
		return await utils.auction__reserveStake()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__declinePerBlock = async (req, res) => {
	try {
		return await utils.auction__declinePerBlock()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__slotsOnSale = async (req, res) => {
	try {
		return await utils.auction__slotsOnSale()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__rewardPerSlot = async (req, res) => {
	try {
		return await utils.auction__rewardPerSlot()

	} catch(err) {
		console.log(err)
	}
}
module.exports.auction__uniqueStakers = async (req, res) => {
	try {
		return await utils.auction__uniqueStakers()

	} catch(err) {
		console.log(err)
	}
}
module.exports.totalAuctionRewards = async (req, res) => {
	try {
		return await utils.totalAuctionRewards()

	} catch(err) {
		console.log(err)
	}
}
module.exports.virtTokenHolders__isHolder = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.virtTokenHolders__isHolder(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.virtTokenHolders__limit = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.virtTokenHolders__limit(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.virtTokenHolders__rewards = async (req, res) => {
	try {
		var idInfo = req.body;
		var arg0 = idInfo.arg0;
		return await utils.virtTokenHolders__rewards(arg0)

	} catch(err) {
		console.log(err)
	}
}
module.exports.initialiseAuction = async (req, res) => {
	try {
		//console.log(req)

		var idInfo = req.body;
		var start = idInfo.start;
		var startStake = idInfo.startStake;
		var reserveStake = idInfo.reserveStake;
		var duration = idInfo.duration;
		var lockup_duration = idInfo.lockup_duration;
		var slotsOnSale = idInfo.slotsOnSale;
		var reward = idInfo.reward;
		return await utils.initialiseAuction(start, startStake, reserveStake, duration, lockup_duration, slotsOnSale, reward)

	} catch(err) {
		console.log(err)
	}
}

module.exports.approve = async (req, res) => {
	try {
		var idInfo = req.body;
		var owner = idInfo.owner;
		var spender = idInfo.spender;
		var amount = idInfo.amount;
		return await utils.approve(owner, spender, amount)

	} catch(err) {
		console.log(err)
	}
}

module.exports.allowance = async (req, res) => {
	try {
		var idInfo = req.body;
		var owner = idInfo.owner;
		var spender = idInfo.spender;
		return await utils.allowance(owner, spender)

	} catch(err) {
		console.log(err)
	}
}

module.exports.balanceOf = async (req, res) => {
	try {
		var idInfo = req.body;
		var account = idInfo.account;
		return await utils.balanceOf(account)

	} catch(err) {
		console.log(err)
	}
}

module.exports.transfer = async (req, res) => {
	try {
		var idInfo = req.body;
		var from = idInfo.from;
		var to = idInfo.to;
		var amount = idInfo.amount;
		return await utils.transfer(from, to, amount)

	} catch(err) {
		console.log(err)
	}
}

module.exports.mint = async (req, res) => {
	try {
		var idInfo = req.body;
		var from = idInfo.from;
		var to = idInfo.to;
		var amount = idInfo.amount;
		return await utils.mint(from, to, amount)

	} catch(err) {
		console.log(err)
	}
}

module.exports.getAuction = async (req, res) => {
	try {
		return await utils.getAuction()

	} catch(err) {
		console.log(err)
	}
}

module.exports.getCurrentStakers = async (req, res) => {
	try {
		return await utils.getCurrentStakers()
		
	} catch(err) {
		console.log(err)
	}
}


module.exports.getLastBidPrice = async (req, res) => {
	try {
		return await utils.getLastBidPrice()
		
	} catch(err) {
		console.log(err)
	}
}


module.exports.selfStakerDeposits = async (req, res) => {
	try {
		var idInfo = req.body;
		var staker = idInfo.staker;
		return await utils.selfStakerDeposits(staker);
	} catch(err) {
		console.log(err)
	}
}

// return amount staked for all the stakers
module.exports.allStakerDeposits = async (req, res) => {
	try {
		let stakers = await utils.getCurrentStakers()
		stakers = stakers.data.filter(function(e) { return e !== '0x0000000000000000000000000000000000000000' });

		let deposits = [];
		for (let i = 0;i < stakers.length;i++) {
			let deposit = await utils.selfStakerDeposits(stakers[i]);
			deposits.push([stakers[i], deposit.data]);
		}

		return deposits;
	} catch(err) {
		console.log(err)
	}
}