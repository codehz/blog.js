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
        GroupController = require('../controllers/group.js')(mongoose, config, db),
        apiRoutes = express.Router();
    const fileUpload = multer({
        dest: '/tmp',
        limits: {
            fields: 1,
            files: 1,
            fileSize: config.fileUploadLimit
        }
    });

    app.use('/api', apiRoutes);
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
        next();
    });

    apiRoutes.param('fileId', utils.requiredParams('fileId'));
    apiRoutes.param('articleId', utils.requiredParams('articleId'));
    apiRoutes.param('commentId', utils.requiredParams('commentId'));
    apiRoutes.param('groupId', utils.requiredParams('groupId'));
    apiRoutes.param('parent', utils.requiredParams('parent'));

    apiRoutes.post('/login', utils.requiredFields("email password"),
        utils.checkPassword, utils.validateEmail, UserController.login);
    apiRoutes.post('/register', utils.requiredFields("name password email phone"),
        utils.checkPassword, utils.validateEmail, utils.validatePhone, UserController.register);

    apiRoutes.get('/file/:fileId', FileController.redirect);

    apiRoutes.route('/public/article').get(ArticleController.find)
        .route(':articleId').get(ArticleController.get)
        .route('comment').get(ArticleController._getArticle, ArticleController.Comment.getAll)
        .route(':commentId').get(ArticleController._getArticle, ArticleController.Comment.getSingle)
    apiRoutes.get('/public/category/:parent', CategoryController.listCategory);

    // Middleware to check user auth
    apiRoutes.use(function (req, res, next) {
        // Check header for token
        var token = req.headers['authorization'];

        // Decode token
        if (token) {
            jwt.verify(token, app.get('secret'), (err, decoded) => {
                if (err) {
                    return utils.error(res, 401, err);
                } else {
                    // Save to request for use in other routes
                    req.decoded = decoded;
                    UserController._check(req, user => {
                        if (user) {
                            req.user = user;
                            console.log("Checked", user.name, user.email);
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

    apiRoutes.get('/me', UserController.current);

    apiRoutes.route('/article')
        .get(ArticleController.find)
        .route(':articleId')
        .get(ArticleController.get)
        .post(utils.requiredBody('title'),
            utils.requiredBody('category'),
            utils.requiredBody('content'),
            ArticleController._checkBlogPermission('create'),
            ArticleController.create)
        .delete(ArticleController._getArticleAndCheckPermission('adminComment'),
            ArticleController.delete)
        .put(ArticleController._getArticleAndCheckPermission('update'),
            ArticleController.update);

    apiRoutes.route('/article/:articleId/comment')
        .use(ArticleController._getArticle)
        .get(ArticleController.Comment.getAll)
        .post(ArticleController._checkBlogPermission,
            ArticleController.Comment.create)
        .route(':commentId')
        .use(ArticleController.Comment._getComment)
        .get(ArticleController.Comment.getSingle)
        .use(ArticleController._checkBlogPermission)
        .post(ArticleController.Comment.create)
        .delete(ArticleController.Comment.delete)
        .put(ArticleController.Comment.changeHideState);

    apiRoutes.route('/file')
        .get(FileController.get)
        .post(FileController._checkPermission, fileUpload.single('file'), FileController.upload)
        .delete(':fileId', FileController._checkPermission, FileController.delete);

    apiRoutes.route('/category')
        .get(':parent?', CategoryController.listCategory)
}