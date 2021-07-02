const validateEnv = require('./envUtils').validateEnv;
const isRopsten = validateEnv('ROPSTEN_NETWORK');
let url;

    // ropsten network config
if (isRopsten === true || isRopsten === "true") {
    const URL = validateEnv('ROPSTEN_NETWORK_URL');

   url = () => new HDWalletProvider("adult theme mistake auction apple outer math twenty across fiction upper boat", + URL)

} else {
    // account network config
    const host = validateEnv('PRIVATE_NETWORK_HOST');
    const port = validateEnv('PRIVATE_NETWORK_RPCPORT');
    url = 'http://' + host + ':' + port;
}

module.exports = {
    url
};
