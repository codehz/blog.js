'use strict'

const async = require('async');

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')();

    function articleResponse(article, owner, list) {
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
            preview: article.preview,
            content: list ? undefined : article.content,
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

    function keywords(req, res, is_public) {
        let query = {};
        if (is_public || !req.user.isSuperUser()) {
            query = { draft: false };
        }
        db.Article.find(query).select('keywords').exec((err, dbResponse) => {
            if (err) return utils.error(res, 422, err.message);
            let map = {};
            async.each(dbResponse, (article, cb_master) => {
                async.each(article.keywords, (value, cb) => {
                    map[value] = (map[value] ? map[value] : 0) + 1;
                    cb();
                }, cb_master);
            }, err => err ? utils.error(res, 422, err.message) : utils.responseData(res, map.count, map));
        })
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
                if (!keywords || !keywords.length) keywords = undefined;
                console.log(keywords);
                const article = db.Article({
                    id: nextArticleId,
                    title: req.body.title,
                    user: req.user,
                    preview: req.body.preview,
                    content: req.body.content,
                    keywords: keywords,
                    draft: !!req.body.draft
                });
                db.Category.setCategory(req.body.category, article, () => article.save(err => err ?
                    db.Sequence.SequenceRollback("articles", utils.error(res, 422, err.message)) :
                    utils.success(res, "create success!")));
            })
        },

        delete(req, res) {
            if (!req.user.isSuperUser() && req.article.user.id != req.user.id) return utils.error(res, 403);
            req.article.remove(err => {
                if (err) return utils.error(res, 422);
                db.Category.tryToRemoveCategory(req.article.category);
                utils.success(res, "delete successful!");
            })
        },

        update(req, res) {
            if (!req.user.isSuperUser() && req.article.user.id != req.user.id) return utils.error(res, 403);

            let old_category = req.article.category;

            if (typeof req.body.title == 'string') req.article.title = req.body.title;
            if (typeof req.body.preview == 'string') req.article.preview = req.body.preview;
            if (typeof req.body.content == 'string') req.article.content = req.body.content;
            if (req.body.keywords instanceof Array) req.article.keywords = req.body.keywords;
            if (typeof req.body.draft == 'boolean') req.article.draft = !!req.body.draft;
            if (typeof req.body.category == 'string' && req.article.category != req.body.category) {
                req.article.category = req.body.category;
            }

            req.article.save((err, article) => {
                if (err) return utils.error(res, 422, err);
                if (req.body.category && req.article.category != old_category) {
                    db.Category.tryToRemoveCategory(old_category);
                    db.Category.setCategory(req.body.category, article, () =>
                        utils.responseData(res, "update success!", articleResponse(article)));
                } else {
                    utils.responseData(res, 'update successful!', articleResponse(article));
                }
            });
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
            if (typeof req.query.title == 'string') query["title"] = new RegExp(req.query.title, "i");
            if (typeof req.query.content == 'string') query["content"] = new RegExp(req.query.content, "i");
            if (typeof req.query.user_name == 'string') query["user.name"] = req.query.user_name;
            if (req.query.keywords instanceof Array) query["keywords"] = { $in: req.query.keywords };
            if (typeof req.query.category == 'string') query["category"] = req.query.category;
            if (req.query.order_type === "asc") sortBy["order_type"] = req.query.order_type;
            if (typeof req.query.draft == 'boolean') query["draft"] = req.query.draft;

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
                        articleResponse(article, req.user && (req.user.isSuperUser() || req.user.id == article.user.id), true));
                utils.responseData(res, ret.count, ret);
            })
        },

        keywordsPublic(req, res) {
            keywords(req, res, true);
        },

        keywords,

        setupPublic(Router) {
            const articleRouter = new Router();

            articleRouter.param('articleId', utils.requiredParams('articleId'));
            articleRouter.param('commentId', utils.requiredParams('commentId'));
            articleRouter.use('/article/:articleId', this._getArticle);
            articleRouter.use('/article/:articleId/comment/:commentId', this.Comment._getComment);

            articleRouter.get('/article', this.find);
            articleRouter.get('/article/:articleId', this.get);
            articleRouter.get('/article/:articleId/comment', this.Comment.getAll);
            articleRouter.get('/article/:articleId/comment/:commentId', this.Comment.getSingle);

            articleRouter.get('/keywords', this.keywordsPublic);

            return articleRouter;
        },

        setup(Router) {
            const articleRouter = new Router();

            articleRouter.param('articleId', utils.requiredParams('articleId'));
            articleRouter.param('commentId', utils.requiredParams('commentId'));
            articleRouter.use('/article/:articleId', this._getArticle);
            articleRouter.use('/article/:articleId/comment/:commentId', this.Comment._getComment);

            articleRouter.route('/article')
                .get(this.find)
                .post(utils.requiredFields('title category content'), utils.checkSuperUser, this.create);
            articleRouter.route('/article/:articleId')
                .get(this.get)
                .put(this.update)
                .delete(utils.checkSuperUser, this.delete);
            articleRouter.route('/article/:articleId/comment')
                .get(this.Comment.getAll)
                .post(this.Comment.create);
            articleRouter.route('/article/:articleId/comment/:commentId')
                .get(this.Comment.getSingle)
                .post(this.Comment.create)
                .delete(this.Comment.delete)
                .put(utils.checkSuperUser, this.Comment.changeHideState);

            articleRouter.get('/keywords', this.keywords);

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
                    ref_id: req.params.commentId ? req.params.commentId : undefined,
                    hide: !req.user.isSuperUser()
                });
                req.article.save(err => err ? utils.error(res, 422, err.message)
                    : utils.responseData(res, "post successful"));
            },

            changeHideState(req, res) {
                if (!req.user.isSuperUser() && (!req.user || req.article.user.id != req.user.id))
                    return utils.error(res, 404); // Pretend it does not exist
                db.Article.update({_id: req.article._id, 'comments._id': req.comment.id}, {'$set': {
                    'comments.$.hide': !!req.body.hide
                }}, err => err ? utils.error(res, 422, err.message)
                    : utils.success(res, "put successful"));
            },

            delete(req, res) {
                if (!req.user.isSuperUser()
                    && req.comment.hide
                    && (!req.user || req.article.user.id != req.user.id) // Logged, but not blogger
                    && req.comment.user.id != req.user.id) // Nor is commentator
                    return utils.error(res, 404);
                req.comment.remove();
                req.article.save(err => err ? utils.error(res, 422, err.message)
                    : utils.responseData(res, "delete successful"));
            }
        }
    }
}
