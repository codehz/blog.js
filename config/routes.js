'use strict'

module.exports = function (mongoose, express, app, db) {
    const jwt = require('jsonwebtoken'),
        multer = require('multer'),
        utils = require('../lib/utils')(),
        config = require('../config/config'),
        UserController = require('../controllers/user')(mongoose, config, db),
        ArticleController = require('../controllers/article.js')(mongoose, config, db),
        CategoryController = require('../controllers/category.js')(mongoose, config, db),
        FileController = require('../controllers/file.js')(mongoose, config, db),
        apiRoutes = express.Router();
    const fileUpload = multer({
        dest: '/tmp',
        limits: {
            fields: 1,
            files: 1,
            fileSize: config.fileUploadLimit
        }
    });

    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUSH,PUT,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
        next();
    });
    app.use('/api', apiRoutes);

    apiRoutes.param('fileId', utils.requiredParams('fileId'));
    apiRoutes.param('groupId', utils.requiredParams('groupId'));
    apiRoutes.param('categoryId', utils.requiredParams('categoryId'));

    apiRoutes.use('/', UserController.setupPublic(express.Router));
    apiRoutes.use('/public', ArticleController.setupPublic(express.Router));
    apiRoutes.use('/', CategoryController.setupPublic(express.Router, ArticleController));
    apiRoutes.use('/', FileController.setupPublic(express.Router))

    apiRoutes.use(utils.genCheckToken(jwt, app, UserController));

    apiRoutes.use('/', UserController.setup(express.Router))
    apiRoutes.use('/', ArticleController.setup(express.Router));
    apiRoutes.use('/', FileController.setup(express.Router, fileUpload));
    
}