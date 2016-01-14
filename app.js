'use strict'
/* global __dirname */
const express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    validator = require('express-validator'),
    morgan = require('morgan'),
    mongoose = require('mongoose'),
    config = require('./config/config'),
    fs = require('fs'),
    jadeStatic = require('connect-jade-static'),
    db = {};

// Connect to mongo db
mongoose.connect(config.db);

// use body parser as middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(validator({
    errorFormatter: function (param, msg, value) {
        const namespace = param.split('.')
            , root = namespace.shift();
        let formParam = root;

        while (namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            field: formParam,
            message: msg
        };
    }
}));

app.set('secret', config.secret);

// config mongoose models
const modelsPath = __dirname + '/models';
fs.readdirSync(modelsPath).forEach(file => {
    if (file.indexOf('.js') >= 0)
        db[file.replace('.js', '')] = require(modelsPath + '/' + file)(mongoose)
});

// Use morgan to log requests to the console
app.use(require('./config/logger')(morgan));

require('./config/routes')(mongoose, express, app, db);

app.use(config.uploadDir, express.static(config.uploadPath));
app.use('/', express.static(config.publicPath));    
//app.use(jadeStatic({ baseDir: config.publicPath, baseUrl: '/', jade: { pretty: true } }));

app.listen(config.port);
console.log("Server is working on http://" + config.host + ":" + config.port);