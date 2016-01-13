'use strict'

module.exports = function (mongoose) {
    const Schema = mongoose.Schema;
    const categoryScheme = new Schema({
        _id: { type: String, index: { unique: true } },
        parent: { type: String, ref: 'Category' }
    });

    categoryScheme.statics.setCategory = (name, target, next) => {
        mongoose.model('Category').findOne({ _id: name }, (err, category) => {
            if (err) throw err;
            if (!category) {
                mongoose.model('Category')({ _id: name }).save((err, category) => {
                    target.category = category;
                    next();
                })
            } else {
                target.category = category;
                next();
            }
        })
    }
    return mongoose.model('Category', categoryScheme);
}