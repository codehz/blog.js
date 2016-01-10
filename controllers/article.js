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
            permission: owner ? article.permission : undefined
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
            content: comment.content,
            ref_id: comment.ref_id,
            hide: comment.hide
        }
    }

    return {
        _checkBlogPermission(permission) {
            return (req, res, next) => {
                if (req.user.isSuperUser()) return next();
                if (req.user.group.blog[permission]) return next();
                utils.error(res, 403);
            }
        },

        _getArticleAndCheckPermission(permission) {
            return (req, res, next) => {
                db.Article.findOne({ id: req.params.articleId })
                    .populate('user')
                    .populate('comments.user').exec((err, article) => {
                        if (err) return utils.error(res, 422, err);
                        if (!article) return utils.error(res, 404);
                        req.article = article;
                        if (req.user.isSuperUser()) return next();
                        if (article.user.id != req.user.id) return next();
                        let target = article.permission.id(req.user.group) || article.permission[0];
                        if (target[permission]) return next();
                        utils.error(res, 403);
                    });
            }
        },

        _getArticleAndCheckPermissionOr(permissions) {
            return (req, res, next) => {
                db.Article.findOne({ id: req.params.articleId })
                    .populate('user')
                    .populate('comments.user').exec((err, article) => {
                        if (err) return utils.error(res, 422, err);
                        if (!article) return utils.error(res, 404);
                        req.article = article;
                        if (article.user.id != req.user.id) return next();
                        let target = article.permission.id(req.user.group) || article.permission[0];
                        if (permissions.filter(permission => target[permission]).count != 0) return next();
                        utils.error(res, 403);
                    });
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
                const keyword = req.body.keyword || req.body.title;
                const article = db.Article({
                    id: nextArticleId,
                    title: req.body.title,
                    user: req.user,
                    content: req.body.content,
                    keywords: keyword.split(','),
                    permission: req.user.blog.permission
                });
                article.save(err => err ?
                    db.Sequence.SequenceRollback("articles", utils.error(res, 422, err.message)) :
                    utils.success(res, "update success!"));
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
            if (req.body.keyword) req.article.keyword = req.body.keyword.split(',');
            if (req.body.permission) {
                try {
                    req.article.permission = JSON.parse(req.body.permission);
                } catch (err) {
                    return utils.error(res, 422, err.message);
                }
            }

            req.article.save((err, article) => err ? utils.error(res, 422, err.message)
                : utils.success(res, articleResponse(article)));
        },
        get(req, res) {
            const id = req.params.articleId;
            let query = {};
            let sortBy = null;

            if (id) {
                query = { id };
            } else {
                sortBy = {};
                sortBy["order_by"] = "created_at";
                sortBy["order_type"] = "desc";
                if (req.query.title) query["title"] = req.query.title;
                if (req.query.user_id) query["user.id"] = req.query.user_id;
                if (req.query.keyword) query["keyword"] = { $in: req.query.keyword.split(',') }
                if (req.query.order_type === "asc") sortBy["order_type"] = req.query.order_type;
            }

            const queryRequest = db.Article.find(query);
            if (sortBy) {
                var sort = {};
                sort[sortBy["order_by"]] = sortBy["order_type"] === "asc" ? "ascending" : "descending";
                queryRequest.sort(sort);
            }

            queryRequest.populate("user").exec((err, dbResponse) => {
                if (err) return utils.error(res, 422, err.message);
                if (!dbResponse) return utils.error(res, 404);
                utils.responseData(res, dbResponse.count, dbResponse.map(article =>
                    articleResponse(article, req.user.isSuperUser() || req.user.id == article.user.id)));
            })
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
                if (!req.user.isSuperUser()
                    && req.comment.hide
                    && (!req.user || req.article.user.id != req.user.id)
                    && req.comment.user.id != req.user.id)
                    return utils.error(res, 404);
                req.article.comments.push({ user: req.user, content: req.body.content, ref_id: req.comment.id });
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