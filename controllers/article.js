'use strict'

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')();

    function articleResponse(article) {
        const user = article.user;
        return {
            id: article.id,
            created_at: article.created_at,
            title: article.title,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            keyword: article.keyword,
            content: article.content
        }
    }

    return {
        create(req, res) {
            db.Sequence.getNextSequence("articles", (err, nextArticleId) => {
                if (err) throw err;
                const article = db.Article({
                    id: nextArticleId,
                    title: req.body.title,
                    user_id: req.user.id,
                    user: req.user,
                    content: req.body.content
                });
                article.save((err, newItem) => err ?
                    utils.error(res, 422, err.message) :
                    utils.success(res, articleResponse(newItem, req.user))
                    );
            })
        },
        delete(req, res) {
            db.Article.findOne({ id: req.params.articleId, user_id: req.user.id }, (err, article) => {
                if (err) return utils.error(res, 422);
                if (!article) return utils.error(res, 404);
                article.remove(err => {
                    if (err) return utils.error(res, 422);
                    return utils.success(res);
                });
            })
        },
        update(req, res) {
            db.Article.findOne({ id: req.params.articleId, user_id: req.user.id }, (err, article) => {
                if (err) return utils.error(res, 422);
                if (!article) return utils.error(res, 404);

                if (req.body.title) article.title = req.body.title;
                if (req.body.content) article.price = req.body.content;

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
                if (req.query.user_id) query["user_id"] = req.query.user_id;
                if (req.query.order_by === "price") sortBy["order_by"] = req.query.order_by;
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
                utils.success(res, dbResponse.map(article => articleResponse(article)));
            })
        }
    }
}