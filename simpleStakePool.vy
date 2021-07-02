#------------------------------------------------------------------------------
#
#   Copyright 2019 Fetch.AI Limited
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
#
#------------------------------------------------------------------------------
from vyper.interfaces import ERC20
import interfaces.dutchStakingInterface as Auction

units: {
    tok: "smallest ERC20 token unit",
}

# Only for the pool owner to keep track. This info could also be inferred from the auction contract,
# allowing to safe storage costs
struct Pool:
    maxStake: uint256(tok)
    totalReward: uint256(tok)
    rewardPerTok: uint256(tok)

token: ERC20
auctionContract: Auction
owner: public(address)

# AID -> pool
registeredPools: public(map(uint256, Pool))
rewardPerTokDenominator: uint256(tok)


@public
def __init__(_ERC20Address: address, _auctionContract: address):
    self.owner = msg.sender
    self.token = ERC20(_ERC20Address)
    self.auctionContract = Auction(_auctionContract)
    self.rewardPerTokDenominator = self.auctionContract.getDenominator()

# @dev Requires that this contract has an ERC20 balance of _totalReward
# @dev Cleans up storage for any registered pool for the previous auction
@public
def registerPool(AID: uint256,
                  _maxStake: uint256(tok),
                  _totalReward: uint256(tok),
                  _rewardPerTok: uint256(tok)):
    assert msg.sender == self.owner, "Owner only"
    assert (_totalReward * self.rewardPerTokDenominator) / _maxStake == _rewardPerTok, "_totalReward, _rewardPerTok mismatch"

    self.registeredPools[AID] = Pool({maxStake: _maxStake,
                                      totalReward: _totalReward,
                                      rewardPerTok: _rewardPerTok})

    self.token.approve(self.auctionContract, as_unitless_number(_totalReward))
    self.auctionContract.registerPool(AID, _totalReward, _rewardPerTok)

    clear(self.registeredPools[AID - 1])

# @dev Enter a bid at the current price, given that poolDeposits >= price
@public
def bidPledgedStake():
    assert msg.sender == self.owner, "Owner only"
    amount: uint256(tok)
    self.auctionContract.bid(amount)

# @notice Make a bid at the current price, adding any amount exceeding
#   poolDeposits as selfStake. Requires that this contract has an ERC20
#   balance of that amount
@public
def bidPledgedAndSelfStake(amount: uint256(tok)):
    assert msg.sender == self.owner, "Owner only"

    currentPrice: uint256(tok) = self.auctionContract.getCurrentPrice()
    existingPoolStake: uint256(tok) = self.auctionContract.poolDeposits(self) + self.auctionContract.selfStakerDeposits(self)
    toApprove: uint256(tok)

    if (amount == 0) and (currentPrice > existingPoolStake):
        toApprove = currentPrice - existingPoolStake
    else:
        assert amount >= currentPrice - existingPoolStake, "Amount below price"
        toApprove = amount - existingPoolStake

    self.token.approve(self.auctionContract, as_unitless_number(toApprove))
    self.auctionContract.bid(toApprove)

# @notice Withdraw self stake and accumulated rewards, transfer them to this contract
@public
def withdrawSelfStake() -> uint256(tok):
    assert msg.sender == self.owner, "Owner only"
    return self.auctionContract.withdrawSelfStake()

# @notice Withdraw this contracts balance
# @param amount: amount to transfer to the owner. Set to 0 to transfer full balance
@public
def retrievePoolBalance(amount: uint256):
    assert msg.sender == self.owner, "Owner only"
    if amount == 0:
        self.token.transfer(self.owner, self.token.balanceOf(self))
    else:
        self.token.transfer(self.owner, amount)

# @notice Retrieve unclaimed pool rewards.
# @dev Automatically done if a bid is entered
@public
def retrieveUnclaimedPoolRewards():
    assert msg.sender == self.owner, "Owner only"
    self.auctionContract.retrieveUnclaimedPoolRewards()
