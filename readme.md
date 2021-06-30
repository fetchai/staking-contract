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
npm install -g truffle@v5.0.36-migrate-describe.1
npm install -g ganache-cli
```

Running tests:

On truffle testnet
```
truffle test
```
On ganache
```
ganache-cli
truffle test --network ganache
```
On ropsten (see truffle-config.js for network settings)
```
truffle test --network ropsten
```
(Note that the compilation warnings stem from the FET ERC20 contract which was developed under earlier standards.)


## Certification
The staking contract has been thouroughly tested and reviewed by certiK and passed with a score of 98.

Full audit report: [certiK report](https://certificate.certik.org/?key=50a2c433dfd82f5a36f71e2e8989e94cc4c1c01834ae85ee61f2f6704c172dbf)

## Deploy contract on a network
```
truffle deploy --network ganache
truffle deploy --network ropsten
```
## Deploy contract on a network with initialization script
```
truffle test initialize.js --network ganache
truffle test initialize.js --network ropsten
```