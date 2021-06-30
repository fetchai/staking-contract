# Dutch Auction Staking Contract

## Installation
Create a virtual environment and install requirements:
```
pipenv install
pipenv shell
```

Use node version manager (nvm) to install latest stable version of npm:

```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash
nvm install node
nvm use node
nvm install --lts
nvm use --lts
```
Install node packages
```
npm install
```

Truffle and Ganache-cli:
```
npm install -g truffle
npm install -g ganache-cli
```

Running tests: in two separate consoles run:
```
ganache-cli
truffle test
```
(Note that the compilation warnings stem from the FET ERC20 contract which was developed under earlier standards.)


## Certification
The staking contract has been thouroughly tested and reviewed by certiK and passed with a score of 98.

Full audit report: [certiK report](https://certificate.certik.org/?key=50a2c433dfd82f5a36f71e2e8989e94cc4c1c01834ae85ee61f2f6704c172dbf)

## Deployed contract
The current version of the contract has been deployed on the Ethereum mainnet and can be found under this address: [0x4f3C38cD3267329f93418F4b106231022cC264c0](https://etherscan.io/address/0x4f3C38cD3267329f93418F4b106231022cC264c0). As a consequence all auctions will be publicly observable and fully verifiable.
If the contract address displayed during an auction should ever deviate from this address it is a sign of the website being either fake or compromised. In that case DO NOT INTERACT WITH THE WEBSITE.

The legacy contract used during the first public auction is deployed at this address but will not be used for any new auctions: [0x10db9941e65da3b7fdb0cd05b1fd434cb8b18158](https://etherscan.io/address/0x10db9941e65da3b7fdb0cd05b1fd434cb8b18158).
