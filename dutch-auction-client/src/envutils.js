// const dotenv = require('dotenv').config(); - lets just source the environment files we want

module.exports.validateEnv = function (key) {
    let value = process.env[key];
    if (!value) {
        console.log("Missing environment variable " + key);
        process.exit(1);
    }
    return value;
}
