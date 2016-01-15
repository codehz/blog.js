'use strict'

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')();

    function articleResponse(article, owner) {
        const user = article.user;
        return {
            id: article.id,
            created_at: article.created_at,
            title: article.title,
            user_id: article.user.id,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            keywords: article.keywords,
            content: article.content,
            draft: article.draft,
            category: article.category
        }
    }

    function commentResponse(comment, owner) {
        const user = comment.user;
        return {
            id: comment.id,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            created_at: comment.created_at,
            content: comment.content,
            ref_id: comment.ref_id,
            hide: comment.hide
        }
    }

    return {
        _checkBlogPermission() {
            return (req, res, next) => {
                if (req.user.isSuperUser()) return next();
                utils.error(res, 403);
            }
        },

        _getArticle(req, res, next) {
            db.Article.findOne({ id: req.params.articleId })
                .populate('user')
                .populate('comments.user').exec((err, article) => {
                    if (err) return utils.error(res, 422, err);
                    if (!article) return utils.error(res, 404);
                    req.article = article;
                    next();
                });
        },

        create(req, res) {
            db.Sequence.getNextSequence("articles", (err, nextArticleId) => {
                if (err) return utils.error(res, 422, err);
                let keywords = req.body.keywords || req.body.title;
                console.log(keywords);
                try {
                    if (keywords && keywords.count) keywords = Array.from(keywords);
                    else keywords = undefined;
                } catch (e) {
                    keywords = undefined;
                }
                const article = db.Article({
                    id: nextArticleId,
                    title: req.body.title,
                    user: req.user,
                    content: req.body.content,
                    keywords: keywords,
                    draft: req.body.draft ? req.body.draft : false
                });
                db.Category.setCategory(req.body.category, article, () => article.save(err => err ?
                    db.Sequence.SequenceRollback("articles", utils.error(res, 422, err.message)) :
                    utils.success(res, "update success!")));
            })
        },
        delete(req, res) {
            if (!req.user.isSuperUser() && req.article.user.id != req.user.id) return utils.error(res, 403);
            req.article.remove(err => err ? utils.error(res, 422)
                : utils.success(res, "delete successful"));
        },
        update(req, res) {
            if (!req.user.isSuperUser() && req.article.user.id != req.user.id) return utils.error(res, 403);

            if (req.body.title) req.article.title = req.body.title;
            if (req.body.content) req.article.price = req.body.content;
            if (req.body.keywords) req.article.keywords = req.body.keywords.split(',');
            if (req.body.draft) req.article.draft = req.body.draft;

            req.article.save((err, article) => err ? utils.error(res, 422, err.message)
                : utils.success(res, articleResponse(article)));
        },
        get(req, res) {
            const id = req.params.articleId;
            db.Article.findOne({ id }).populate("user").exec((err, article) => {
                if (err) return utils.error(res, 422, err.message);
                if (!article) return utils.error(res, 404);
                if (article.draft && !(req.user && (req.user.isSuperUser() || req.user.id == article.user.id)))
                    return utils.error(res, 422, err.message);
                utils.responseData(res, article.id, articleResponse(article,
                    req.user && (req.user.isSuperUser() || req.user.id == article.user.id)));
            })
        },
        find(req, res) {
            let query = {};
            let sortBy = null;

            sortBy = {};
            sortBy["order_by"] = "created_at";
            sortBy["order_type"] = "desc";
            if (req.query.title) query["title"] = req.query.title;
            if (req.query.user_id) query["user.id"] = req.query.user_id;
            if (req.query.keywords) query["keywords"] = { $in: req.query.keywords.split(',') }
            if (req.query.category) query["category"] = { $in: req.query.category.split(',') }
            if (req.query.order_type === "asc") sortBy["order_type"] = req.query.order_type;
            if (req.query.draft) query["draft"] = req.query.draft;

            const queryRequest = db.Article.find(query);
            if (sortBy) {
                var sort = {};
                sort[sortBy["order_by"]] = sortBy["order_type"] === "asc" ? "ascending" : "descending";
                queryRequest.sort(sort);
            }

            queryRequest.populate("user").exec((err, dbResponse) => {
                if (err) return utils.error(res, 422, err.message);
                if (!dbResponse) return utils.error(res, 404);
                let ret = dbResponse
                    .filter(article => !article.draft || (req.user && (req.user.isSuperUser() || req.user.id == article.user.id)))
                    .map(article =>
                        articleResponse(article, req.user && (req.user.isSuperUser() || req.user.id == article.user.id)));
                utils.responseData(res, ret.count, ret);
            })
        },

        setupPublic(Router) {
            const articleRouter = new Router();

            articleRouter.param('articleId', utils.requiredParams('articleId'));
            articleRouter.param('commentId', utils.requiredParams('commentId'));
            articleRouter.use('/article/:articleId', this._getArticle);
            articleRouter.use('/article/:articleId/comment/:commentId', this._getArticle);

            articleRouter.get('/article', this.find);
            articleRouter.get('/article/:articleId', this.get);
            articleRouter.get('/article/:articleId/comment', this.Comment.getAll);
            articleRouter.get('/article/:articleId/comment/:commentId', this.Comment.getAll);

            return articleRouter;
        },

        setup(Router) {
            const articleRouter = this.setupPublic(Router);

            articleRouter.post('/article', utils.requiredFields('title category content'), utils.checkSuperUser, this.create);
            articleRouter.route('/article/:articleId').put(this.update).delete(utils.checkSuperUser, this.delete);
            articleRouter.route('/article/:articleId/comment').post(this.Comment.create);
            articleRouter.route('/article/:articleId/comment/:commentId')
                .post(this.Comment.create).delete(this.Comment.delete).put(utils.checkSuperUser, this.Comment.changeHideState);

            return articleRouter;
        },
        Comment: {
            _getComment(req, res, next) {
                let comment = req.article.comments.id(req.params.commentId);
                if (!comment) return utils.error(res, 404);
                req.comment = comment;
                next();
            },

            getAll(req, res) {
                // Only bloggers and commentators can see the hidden comments
                let ret = req.user && (req.user.isSuperUser() || req.article.user.id == req.user.id) ? req.article.comments
                    : req.article.comments.filter(comment => !comment.hide || (req.user && comment.user.id == req.user.id))
                utils.responseData(res, ret.count, ret.map(comment => commentResponse(comment)));
            },

            getSingle(req, res) {
                if (!req.user.isSuperUser()
                    && req.comment.hide
                    && (!req.user || req.article.user.id != req.user.id) // Logged, but not blogger
                    && req.comment.user.id != req.user.id) // Nor is commentator
                    return utils.error(res, 404); // Pretend it does not exist
                utils.responseData(res, "", commentResponse(req.comment));
            },

            create(req, res) {
                if (!req.article.comments) req.article.comments = [];
                if (req.params.commentId
                    && !req.user.isSuperUser()
                    && req.comment.hide
                    && (!req.user || req.article.user.id != req.user.id)
                    && req.comment.user.id != req.user.id)
                    return utils.error(res, 404);
                req.article.comments.push({
                    user: req.user,
                    content: req.body.content,
                    ref_id: req.comment ? req.comment.id : undefined
                });
                req.article.save(err => err ? utils.error(res, 422, err.message)
                    : utils.responseData(res, "post successful"));
            },

            changeHideState(req, res) {
                if (!req.user.isSuperUser() && (!req.user || req.article.user.id != req.user.id))
                    return utils.error(res, 404); // Pretend it does not exist
                req.comment.hide = !!req.params.hide;
                req.comment.save();
            },

            delete(req, res) {
                req.comment.remove();
                req.article.save(err => err ? utils.error(res, 422, err.message)
                    : utils.responseData(res, "delete successful"));
            }
        }
    }
}