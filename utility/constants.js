const BN = require('bn.js');

// have to match contract global constants
exports.AuctionConstants = {
  _reserve_price_duration: 25,
  _delete_period: 60 * (3600 * 24),
  _reward_per_tok_denominator: new BN('100000'),
  _max_slots: 200,
}

exports.FET_ERC20 = {
    _name : "Fetch.AI",
    _symbol : "FET",
    // source codes seems to require initial supply to already be multiplied by _decimals
    _initialSupply : new BN("1152997575000000000000000000"),
    _decimals : 18,
    _mintable : false,
    multiplier: new BN('1000000000000000000')  // according to decimals, to convert FET into the smallest unit of FET
};
