var express = require('express');
var client = require('./src/client');
var app = express();
var port = process.env.PORT || 9050;
var router = express.Router();

var bodyParser = require('body-parser');
var cors = require('cors');
var router = express.Router();

/*--------------------------middlewares--------------------------------------------------*/

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

router.use(function (req, res, next) {
    next();
});

/*---------------------------routes------------------------------------------------------*/

router.route('/getFinalStakers').post(function (req, res) {
	try {
		client.getFinalStakers(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
})

router.route('/getERC20Address').post(function (req, res) {
	try {
		client.getERC20Address(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/getCurrentPrice').post(function (req, res) {
	try {
		client.getCurrentPrice(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/retrieveUndistributedAuctionRewards').post(function (req, res) {
	try {
		client.retrieveUndistributedAuctionRewards(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/bid').post(function (req, res) {
	try {
		client.bid(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/finaliseAuction').post(function (req, res) {
	try {
		client.finaliseAuction(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/endLockup').post(function (req, res) {
	try {
		client.endLockup(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/abortAuction').post(function (req, res) {
	try {
		client.abortAuction(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/withdrawSelfStake').post(function (req, res) {
	try {
		client.withdrawSelfStake(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/deleteContract').post(function (req, res) {
	try {
		client.deleteContract(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/getDenominator').post(function (req, res) {
	try {
		client.getDenominator(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/getFinalSlotsSold').post(function (req, res) {
	try {
		client.getFinalSlotsSold(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/getFinalStakerSlots').post(function (req, res) {
	try {
		client.getFinalStakerSlots(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/isBiddingPhase').post(function (req, res) {
	try {
		client.isBiddingPhase(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/isFinalised').post(function (req, res) {
	try {
		client.isFinalised(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/calculateSelfStakeNeeded').post(function (req, res) {
	try {
		client.calculateSelfStakeNeeded(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/owner').post(function (req, res) {
	try {
		client.owner(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/earliestDelete').post(function (req, res) {
	try {
		client.earliestDelete(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/priceAtBid').post(function (req, res) {
	try {
		client.priceAtBid(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/currentAID').post(function (req, res) {
	try {
		client.currentAID(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/totalAuctionRewards').post(function (req, res) {
	try {
		client.totalAuctionRewards(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/initialiseAuction').post(function (req, res) {
	try {
		console.log(req.body)
		client.initialiseAuction(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/approve').post(function (req, res) {
	try {
		client.approve(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/allowance').get(async function (req, res) {
	try {
		client.allowance(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/balanceOf').get(function (req, res) {
	try {
		client.balanceOf(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/transfer').post(function (req, res) {
	try {
		client.transfer(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/mint').post(function (req, res) {
	try {
		client.mint(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/getAuction').get(function (req, res) {
	try {
		client.getAuction(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
});

router.route('/getCurrentStakers').post(function (req, res) {
	try {
		client.getCurrentStakers(req, res).then(result => { 
			return res.status(200).json(result)
		})

	} catch(err) {
		console.log(err)
		return res.status(500).json({
			status: "error"
		})
	}
})

app.use('/dutchAuctionClient', router);
app.listen(port);
console.log('Dutch Auction Client Service is running on ' + port);