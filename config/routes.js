'use strict'

module.exports = function (mongoose, express, app, db) {
    const jwt = require('jsonwebtoken')
        , multer = require('multer')
        , utils = require('../lib/utils')()
        , config = require('../config/config')
        , UserController = require('../controllers/user')(mongoose, config, db)
        , ArticleController = require('../controllers/article.js')(mongoose, config, db)
        , apiRoutes = express.Router();
    const fileUpload = multer({
        dest: config.uploadPath
    });

    app.use('/api', apiRoutes);
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
        next();
    });
    apiRoutes.post('/login', utils.requiredFields("email password"),
        utils.checkPassword, utils.validateEmail, UserController.login);
    apiRoutes.post('/register', utils.requiredFields("name password email phone"),
        utils.checkPassword, utils.validateEmail, utils.validatePhone, UserController.register);

    // Middleware to check user auth
    apiRoutes.use(function (req, res, next) {
        // Check header for token
        var token = req.headers['authorization'];

        // Decode token
        if (token) {
            jwt.verify(token, app.get('secret'), function (err, decoded) {
                if (err) {
                    return utils.error(res, 401, err);
                } else {
                    // Save to request for use in other routes
                    req.decoded = decoded;
                    UserController._check(req, (user) => {
                        if (user) {
                            req.user = user;
                            console.log("Checked", user);
                            next();
                        } else utils.error(res, 401, "Token Check failed!");
                    })
                }
            });
        } else {
            // No token - unauthorized
            return utils.error(res, 401, "No Token");
        }
    });
}