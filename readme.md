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
The staking contract has been thouroughly tested and reviewed by certiK and passed with a score of 100.

![certiK_score](/docs/certiK_score.png)

Full audit report: [certiK report](https://certik.org/certificate.html?key=64309cb8a0642178e748f99212c7fc1076a342b6119aa0e2aa9efa948ff5e93d)

## Deployed contract
The contract has been deployed on the Ethereum mainnet and can be found under this address: [0x10db9941e65da3b7fdb0cd05b1fd434cb8b18158](https://etherscan.io/address/0x10db9941e65da3b7fdb0cd05b1fd434cb8b18158). As a consequence all auctions will be publicly observable and fully verifiable.
If the contract address displayed during an auction should ever deviate from this address it is a sign of the website being either fake or compromised. In that case DO NOT INTERACT WITH THE WEBSITE.