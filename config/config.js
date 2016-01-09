'use strict'
/* global process */
/* global __dirname */
let path = require('path')
    , rootPath = path.normalize(__dirname + '/..')
    , env = process.env.NODE_ENV || 'development'
    , secret = 'OVERLOAD_CODE_HZ_OPNOTPERMIT_FBR'
    , uploadDir = '/uploads'
    , uploadPath = rootPath + uploadDir
    , fileUploadLimit = 10485760 // 10 MB
;
let config = {
    development: {
        root: rootPath,
        app: {
            name: 'blogjs'
        },
        port: 8080,
        db: 'mongodb://localhost/master-dev',
        secret: secret,
        uploadDir: uploadDir,
        uploadPath: uploadPath,
        fileUploadLimit: fileUploadLimit
    },

    production: {
        root: rootPath,
        app: {
            name: 'blogjs'
        },
        port: 80,
        db: 'mongodb://localhost/master',
        secret: secret,
        uploadDir: uploadDir,
        uploadPath: uploadPath,
        fileUploadLimit: fileUploadLimit
    }
};

module.exports = config[env];