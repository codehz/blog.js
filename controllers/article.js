'use strict'

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')();

    function articleResponse(article) {
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
            content: article.content
        }
    }

    function commentResponse(comment) {
        return {
            id: comment.id,
            user: comment.user,
            content: comment.content,
            ref_id: comment.ref_id,
            hide: hide
        }
    }

    return {
        create(req, res) {
            db.Sequence.getNextSequence("articles", (err, nextArticleId) => {
                if (err) return utils.error(res, 422, err);
                const keyword = req.body.keyword || req.body.title;
                const article = db.Article({
                    id: nextArticleId,
                    title: req.body.title,
                    user: req.user,
                    content: req.body.content,
                    keywords: keyword.split(',')
                });
                article.save(err => err ?
                    utils.error(res, 422, err.message) :
                    utils.success(res, "update success!")
                    );
            })
        },
        delete(req, res) {
            db.Article.findOne({ id: req.params.articleId }).populate('user').exec((err, article) => {
                if (err) return utils.error(res, 422, err);
                if (article.user.id != req.user.id) return utils.error(res, 403, "Forbidden");
                if (!article) return utils.error(res, 404);
                article.remove(err => err ? utils.error(res, 422)
                    : utils.success(res, "delete successful"));
            })
        },
        update(req, res) {
            db.Article.findOne({ id: req.params.articleId }).populate('user').exec((err, article) => {
                if (err) return utils.error(res, 422, err);
                if (!article) return utils.error(res, 404);
                if (article.user.id != req.user.id) return utils.error(res, 403, "Forbidden");

                if (req.body.title) article.title = req.body.title;
                if (req.body.content) article.price = req.body.content;
                if (req.body.keyword) article.keyword = req.body.keyword.split(',');

                article.save((err, article) => utils.success(res, articleResponse(article)));
            });
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
                utils.responseData(res, dbResponse.count, dbResponse.map(article => articleResponse(article)));
            })
        },
        Comment: {
            preComment(req, res, next) {
                const id = req.params.articleId;
                db.Article.findOne({ id }).populate("user").populate('comments.user').exec((err, article) => {
                    if (err) return utils.error(res, 422, err.message);
                    if (!article) return utils.error(res, 404);
                    req.article = article;
                    next();
                })
            },

            getAll(req, res) {
                // Only bloggers and commentators can see the hidden comments
                let ret = req.user && req.article.user.id == req.user.id ? req.article.comments
                    : req.article.comments.filter(comment => !comment.hide && req.user && comment.user.id != req.user.id)
                res.responseData(res, ret.count, ret);
            },

            getSingle(req, res) {
                let comment = req.article.comments.id(req.params.commentId);
                if (!comment) return utils.error(res, 404);
                if (comment.hide && !req.user || req.article.user.id != req.user.id && comment.user.id != req.user.id)
                    return utils.error(res, 403, "Forbidden");
                res.responseData(res, "", comment);
            },

            post(req, res) {
                if (!req.article.comments) req.article.comments = [];
                req.article.comments.push({ user: req.user, content: req.body.content, ref_id: req.params.commentId });
                req.article.save(err => err ? utils.error(res, 422, err.message)
                    : utils.responseData(res, "post successful"));
            },

            delete(req, res) {
                let comment = req.article.comments.id(req.params.commentId);
                if (!comment) return utils.error(res, 404);
                comment.remove();
                req.article.save(err => err ? utils.error(res, 422, err.message)
                    : utils.responseData(res, "post successful"));
            }
        }
    }
}