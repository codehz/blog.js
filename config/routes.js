'use strict'

module.exports = function (mongoose, express, app, db) {
    const jwt = require('jsonwebtoken')
        , multer = require('multer')
        , utils = require('../lib/utils')()
        , config = require('../config/config')
        , UserController = require('../controllers/user')(mongoose, config, db)
        , ArticleController = require('../controllers/article.js')(mongoose, config, db)
        , FileController = require('../controllers/file.js')(mongoose, config, db)
        , GroupController = require('../controllers/group.js')(mongoose, config, db)
        , apiRoutes = express.Router();
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
    apiRoutes.post('/login', utils.requiredFields("email password"),
        utils.checkPassword, utils.validateEmail, UserController.login);
    apiRoutes.post('/register', utils.requiredFields("name password email phone"),
        utils.checkPassword, utils.validateEmail, utils.validatePhone, UserController.register);

    apiRoutes.get('/file/:fileId', utils.requiredParams('fileId'), FileController.redirect);

    apiRoutes.get('/public/article/:articleId', utils.requiredParams('articleId'), ArticleController.get);
    apiRoutes.get('/public/article', ArticleController.find);
    apiRoutes.get('/public/article/:articleId/comment/:commentId',
        utils.requiredParams('articleId'),
        utils.requiredParams('commentId'),
        ArticleController._getArticle,
        ArticleController.Comment.getSingle);
    apiRoutes.get('/public/article/:articleId/comment', utils.requiredParams('articleId'),
        ArticleController._getArticle, ArticleController.Comment.getAll);

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

    apiRoutes.get('/article/:articleId', utils.requiredParams('articleId'), ArticleController.get);
    apiRoutes.get('/article', ArticleController.find);
    apiRoutes.post('/article', utils.requiredBody('title'), utils.requiredBody('content'),
        ArticleController._checkBlogPermission('create'),
        ArticleController.create);
    apiRoutes.delete('/article/:articleId', utils.requiredParams('articleId'),
        ArticleController._getArticleAndCheckPermission('adminComment'),
        ArticleController.delete);
    apiRoutes.put('/article/:articleId', utils.requiredParams('articleId'),
        ArticleController._getArticleAndCheckPermission('update'),
        ArticleController.update);

    apiRoutes.post('/article/:articleId/comment',
        utils.requiredParams('articleId'),
        ArticleController._getArticleAndCheckPermission('comment'),
        ArticleController.Comment.create);
    apiRoutes.post('/article/:articleId/comment/:commentId',
        utils.requiredParams('articleId'),
        utils.requiredParams('commentId'),
        ArticleController._getArticleAndCheckPermission('comment'),
        ArticleController.Comment._getComment,
        ArticleController.Comment.create);
    apiRoutes.delete('/article/:articleId/comment/:commentId',
        utils.requiredParams('articleId'),
        utils.requiredParams('commentId'),
        ArticleController._getArticleAndCheckPermissionOr('comment', 'admin_comment'),
        ArticleController.Comment._getComment,
        ArticleController.Comment.delete);
    apiRoutes.get('/article/:articleId/comment/:commentId',
        utils.requiredParams('articleId'),
        utils.requiredParams('commentId'),
        ArticleController._getArticle,
        ArticleController.Comment._getComment,
        ArticleController.Comment.getSingle);
    apiRoutes.get('/article/:articleId/comment', utils.requiredParams('articleId'),
        ArticleController._getArticle, ArticleController.Comment.getAll);
    apiRoutes.put('/article/:articleId/comment/:commentId',
        utils.requiredParams('articleId'),
        utils.requiredParams('commentId'),
        ArticleController._getArticle,
        ArticleController.Comment._getComment,
        ArticleController.Comment.changeHideState);

    apiRoutes.post('/file', FileController._checkPermission, fileUpload.single('file'), FileController.upload);
    apiRoutes.delete('/file/:fileId', FileController._checkPermission, utils.requiredParams('fileId'), FileController.delete);
    apiRoutes.get('/file', FileController.get);

    apiRoutes.get('/group', GroupController._checkPermission, GroupController.getAll);
    apiRoutes.get('/group/:groupId',
        GroupController._checkPermission,
        utils.requiredParams('groupId'),
        GroupController.getSingle);
    apiRoutes.put('/group/:groupId',
        GroupController._checkPermission,
        utils.requiredParams('groupId'),
        GroupController._getGroup,
        GroupController.update);
    apiRoutes.delete('/group/:groupId',
        GroupController._checkPermission,
        utils.requiredParams('groupId'),
        GroupController._getGroup,
        GroupController.delete);
    apiRoutes.post('/grouop/:groupId',
        GroupController._checkPermission,
        utils.requiredParams('groupId'),
        utils.requiredBody('blog'),
        utils.requiredBody('common'),
        GroupController.create);
    apiRoutes.put('/group/:groupId',
        GroupController._checkPermission,
        utils.requiredParams('groupId'),
        GroupController._getGroup,
        GroupController.update);
}