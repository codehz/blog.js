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
            const categoryId = req.params.categoryId ? req.params.categoryId : { $exists: false };
            db.find({ parent: categoryId }, (err, categories) => {
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

        setup(Router) {
            const categoryRouter = new Router();
            categoryRouter.param('categoryId', utils.requiredParams('categoryId'));

            categoryRouter.post('/category/:categoryId', this.redirectQuery);

            return categoryRouter;
        }
    }
}