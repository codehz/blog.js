'use strict'

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')();

    return {
        postCategory(req, res) {
            const name = req.body.name;
            const newCategory = db.Category({
                _id: name,
            });
            newCategory.save(err => err ?
                utils.error(res, 422, err.message) :
                utils.success(res, "post success!"));
        },

        listCategory(req, res) {
            const parent = req.params.parent ? req.params.parent : { $exists: false };
            db.find({ parent: parent }, (err, categories) => {
                if (err) utils.error(res, 422, err.message);
                utils.responseData(res, categories.count, categories);
            });
        },
        
        redirectQuery(req, res, next) {
            req.query.category = req.params.categoryId;
            next();
        }
    }
}