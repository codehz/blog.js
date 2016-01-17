'use strict'
/* global process */
/* global __dirname */
const path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development',
    secret = 'OVERLOAD_CODE_HZ_OPNOTPERMIT_FBR',
    dbBase = process.env.DB_BASE || 'mongodb://localhost/',
    uploadDir = '/uploads',
    uploadPath = rootPath + uploadDir,
    publicDir = '/public',
    publicPath = rootPath + publicDir,
    fileUploadLimit = 10485760, addrs = [], os = require('os'), interfaces = os.networkInterfaces();

const configs = {
    development: {
        root: rootPath,
        app: {
            name: 'blogjs'
        },
        port: 8000,
        db: dbBase + 'master-dev',
        secret,
        uploadDir,
        uploadPath,
        fileUploadLimit,
        publicDir,
        publicPath
    },

    production: {
        root: rootPath,
        app: {
            name: 'blogjs'
        },
        port: 80,
        db: dbBase + 'master',
        secret,
        uploadDir,
        uploadPath,
        fileUploadLimit,
        publicDir,
        publicPath
    }
};

let config = configs[env];

if (!(config.host = process.env.BLOG_JS_HOST)) {
    // Set config.host ip
    for (let k in interfaces) {
        for (let k2 in interfaces[k]) {
            let address = interfaces[k][k2]
            if (address.family == 'IPv4' && !address.internal)
                addrs.push(address.address)
        }
    }

    config.host = addrs.pop();
}

module.exports = config;