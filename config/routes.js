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
    apiRoutes.param('categoryId', utils.requiredParams('categoryId'));

    apiRoutes.post('/login', utils.requiredFields("email password"),
        utils.checkPassword, utils.validateEmail, UserController.login);
    apiRoutes.post('/register', utils.requiredFields("name password email phone"),
        utils.checkPassword, utils.validateEmail, utils.validatePhone, UserController.register);

    apiRoutes.get('/file/:fileId', FileController.redirect);

    const public_article = apiRoutes.route('/public/article');
    public_article.get(ArticleController.find);
    public_article.route(':articleId').get(ArticleController.get);
    public_article.route('comment').get(ArticleController._getArticle, ArticleController.Comment.getAll);
    public_article.route(':commentId').get(ArticleController._getArticle, ArticleController.Comment.getSingle);
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

    const article = apiRoutes.route('/article');
    article.get(ArticleController.find)
    const articleId = article.route(':articleId');
    articleId.get(ArticleController.get);
    articleId.use(utils.checkSuperUser);
    articleId.post(utils.requiredFields('title category content'),
        utils.checkSuperUser, ArticleController.create)
        .delete(utils.checkSuperUser, ArticleController.delete)
        .put(utils.checkSuperUser, ArticleController.update);

    const comment = apiRoutes.route('/article/:articleId/comment')
    comment.use(ArticleController._getArticle)
    comment.get(ArticleController.Comment.getAll)
        .post(ArticleController._checkBlogPermission,
            ArticleController.Comment.create);
    const commentId = comment.route(':commentId');
    commentId.use(ArticleController.Comment._getComment)
        .get(ArticleController.Comment.getSingle)
    commentId.use(ArticleController._checkBlogPermission)
        .post(ArticleController.Comment.create)
        .delete(ArticleController.Comment.delete)
        .put(ArticleController.Comment.changeHideState);

    apiRoutes.route('/file')
        .get(FileController.get)
        .post(utils.checkSuperUser, fileUpload.single('file'), FileController.upload)
        .delete(':fileId', utils.checkSuperUser, FileController.delete);

    apiRoutes.route('/category')
        .get(':categoryId?', CategoryController.listCategory)
        .get(':categoryId/articles', CategoryController.redirectQuery)
        .post(':categoryId', utils.checkSuperUser, CategoryController.postCategory)
}