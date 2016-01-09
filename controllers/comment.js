'use strict'

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')();

    function commentResponse(comment, _user) {
        const user = _user || comment.user;
        return {
            id: comment.id,
            created_at: comment.created_at,
            user_id: comment.user_id,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            target_article_id: comment.target_article_id,
            target_id: comment.target_id,
            content: comment.content
        }
    }

    function createComment(res, content, user, target_article, target) {
        db.Sequence.getNextSequence('comment', (err, id) => {
            const comment = db.Comment({
                id,
                user_id: user.id,
                user,
                target_article_id: target_article.id,
                target_article,
                target_id: target ? target.id : 0,
                target,
                content
            });
            comment.save(err => err ?
                utils.error(res, 422, err.message) :
                utils.success(res, "update success!", commentResponse(comment, user))
                )
        });
    }

    return {
        create(req, res) {
            db.Article.findOne({ id: req.body.article }, (err, target_article) => {
                if (err) return utils.error(res, 422, err);
                if (!target_article) return utils.error(res, 404);
                if (req.body.target) {
                    db.Comment.findOne({ id: req.body.target }, (err, target) =>
                        createComment(res, req.body.content, req.user, target_article, target));
                } else {
                    createComment(res, req.body.content, req.user, target_article);
                }
            });
        },

        delete(req, res) {
            db.Comment.findOne({ id: req.params.commentId }).exec((err, comment) => {
                if (err) return utils.error(res, 422, err);
                if (!comment) return utils.error(res, 404);
                if (comment.user_id != req.user.id
                    || comment.target_article.user_id != req.user.id
                    || comment.target.user_id != req.user.id) return utils.error(res, 403, "Forbidden");
                if (!comment) return utils.error(res, 404);
                comment.remove(err => err ? utils.error(res, 422) : utils.success(res));
            })
        },

        get(req, res) {
            const id = req.params.commentId;
            let query = {};
            let sortBy = null;

            if (id) {
                query = { id };
            } else {
                sortBy = {};
                sortBy["order_by"] = "created_at";
                sortBy["order_type"] = "desc";
                if (req.query.user_id) query["user_id"] = req.query.user_id;
                if (req.query.target_article_id) query["target_article_id"] = req.query.target_article_id;
                if (req.query.target_id) query["target_id"] = req.query.target_id;
            }

            const queryRequest = db.Comment.find(query);
            if (sortBy) {
                var sort = {};
                sort[sortBy["order_by"]] = sortBy["order_type"] === "asc" ? "ascending" : "descending";
                queryRequest.sort(sort);
            }

            queryRequest.populate({path: 'user', select: 'id name email'}).exec((err, dbResponse) => {
                if (err) return utils.error(res, 422, err.message);
                if (!dbResponse) return utils.error(res, 404);
                utils.responseData(res, dbResponse.count, dbResponse.map(comment => commentResponse(comment)));
            })
        }
    }
}