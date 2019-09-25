units: {
    tok: "smallest ERC20 token unit",
}

# Events

Bid: event({AID: uint256, _from: address, currentPrice: uint256(tok), amount: uint256(tok)})
NewAuction: event({AID: uint256, start: uint256, end: uint256, lockupEnd: uint256, startStake: uint256(tok), reserveStake: uint256(tok), declinePerBlock: uint256(tok), slotsOnSale: uint256, rewardPerSlot: uint256(tok)})
PoolRegistration: event({AID: uint256, _address: address, maxStake: uint256(tok), rewardPerTok: uint256(tok)})
NewPledge: event({AID: uint256, _from: address, operator: address, amount: uint256(tok)})
AuctionFinalised: event({AID: uint256, finalPrice: uint256(tok), slotsSold: uint256(tok)})
LockupEnded: event({AID: uint256})
AuctionAborted: event({AID: uint256, rewardsPaid: bool})

# Functions

@public
def initialiseAuction(_start: uint256, _startStake: uint256(tok), _reserveStake: uint256(tok), _duration: uint256, _lockup_duration: uint256, _slotsOnSale: uint256, _reward: uint256(tok)):
    pass

@public
def retrieveUndistributedAuctionRewards():
    pass

@public
def abortAuction(payoutRewards: bool):
    pass

@public
def bid(_topup: uint256(tok)):
    pass

@public
def finaliseAuction(finalPrice: uint256(tok)):
    pass

@public
def endLockup():
    pass

@public
def registerPool(AID: uint256, _totalReward: uint256(tok), _rewardPerTok: uint256(tok)):
    pass

@public
def retrieveUnclaimedPoolRewards():
    pass

@public
def pledgeStake(AID: uint256, pool: address, amount: uint256(tok)):
    pass

@public
def withdrawSelfStake() -> uint256(tok):
    pass

@public
def withdrawPledgedStake() -> uint256(tok):
    pass

@public
def deleteContract():
    pass

@constant
@public
def getERC20Address() -> address:
    pass

@constant
@public
def getDenominator() -> uint256(tok):
    pass

@constant
@public
def getFinalStakerSlots(staker: address) -> uint256:
    pass

@constant
@public
def getFinalStakers() -> address[300]:
    pass

@constant
@public
def getFinalSlotsSold() -> uint256:
    pass

@constant
@public
def isBiddingPhase() -> bool:
    pass

@constant
@public
def isFinalised() -> bool:
    pass

@constant
@public
def getCurrentPrice() -> uint256(tok):
    pass

@constant
@public
def calculateSelfStakeNeeded(_address: address) -> uint256(tok):
    pass

@constant
@public
def owner() -> address:
    pass

@constant
@public
def earliestDelete() -> uint256(sec, positional):
    pass

@constant
@public
def pledgedDeposits(arg0: address) -> uint256(tok):
    pass

@constant
@public
def poolStakerDeposits__amount(arg0: address) -> uint256(tok):
    pass

@constant
@public
def poolStakerDeposits__AID(arg0: address) -> uint256:
    pass

@constant
@public
def selfStakerDeposits(arg0: address) -> uint256(tok):
    pass

@constant
@public
def bidAtPrice(arg0: address) -> uint256(tok):
    pass

@constant
@public
def registeredPools__remainingReward(arg0: address) -> uint256(tok):
    pass

@constant
@public
def registeredPools__rewardPerTok(arg0: address) -> uint256(tok):
    pass

@constant
@public
def registeredPools__AID(arg0: address) -> uint256:
    pass

@constant
@public
def currentAID() -> uint256:
    pass

@constant
@public
def auction__finalPrice() -> uint256(tok):
    pass

@constant
@public
def auction__lockupEnd() -> uint256:
    pass

@constant
@public
def auction__slotsSold() -> uint256:
    pass

@constant
@public
def auction__start() -> uint256:
    pass

@constant
@public
def auction__end() -> uint256:
    pass

@constant
@public
def auction__startStake() -> uint256(tok):
    pass

@constant
@public
def auction__reserveStake() -> uint256(tok):
    pass

@constant
@public
def auction__declinePerBlock() -> uint256(tok):
    pass

@constant
@public
def auction__slotsOnSale() -> uint256:
    pass

@constant
@public
def auction__uniqueStakers() -> uint256:
    pass

@constant
@public
def totalAuctionRewards() -> uint256(tok):
    pass

@constant
@public
def rewardPerSlot() -> uint256(tok):
    pass
