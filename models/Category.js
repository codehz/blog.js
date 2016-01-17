'use strict'

module.exports = function (mongoose) {
    const Schema = mongoose.Schema;
    const categoryScheme = new Schema({
        _id: { type: String, index: { unique: true } },
        parent: { type: String, ref: 'Category' }
    });

    categoryScheme.statics.setCategory = (name, target, next) => {
        mongoose.model('Category').findById(name, (err, category) => {
            if (err) throw err;
            if (!category) {
                mongoose.model('Category')({ _id: name }).save((err, category) => {
                    target.category = category;
                    next();
                });
            } else {
                target.category = category;
                next();
            }
        });
    }

    categoryScheme.statics.tryToRemoveCategory = (name) => {
        mongoose.model('Category').findById(name, (err, category) => {
            if (err) throw err;
            if (category) {
                mongoose.model('Article').find({ category: name }, (err, articles) => {
                    if (articles.length == 0) {
                        category.remove();
                    }
                });
            }
        });
    }
    return mongoose.model('Category', categoryScheme);
}