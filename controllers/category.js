'use strict'

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')();

    return {
        listCategory(req, res) {
            const categoryId = req.params.categoryId ? req.params.categoryId : { $exists: false };
            console.log(categoryId);
            db.Category.find({ parent: categoryId }, (err, categories) => {
                if (err) utils.error(res, 422, err.message);
                utils.responseData(res, categories.count, categories);
            });
        },

        redirectQuery(req, res, next) {
            req.query.category = req.params.categoryId;
            next();
        },

        setupPublic(Router) {
            const categoryRouter = new Router();
            categoryRouter.param('categoryId', utils.requiredParams('categoryId'));

            categoryRouter.get('/category/:categoryId?', this.listCategory);
            categoryRouter.get('/category/:categoryId/articles', this.redirectQuery);

            return categoryRouter;
        },
    }
}