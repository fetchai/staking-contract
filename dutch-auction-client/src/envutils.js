const dotenv = require('dotenv').config();

module.exports.validateEnv = function (key) {
    let value = process.env[key];
    if (!value) {
        console.log("Missing environment variable " + key);
        process.exit(0);
    }
    return value;
}