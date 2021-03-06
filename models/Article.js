'use strict'

module.exports = function (mongoose) {
    const Schema = mongoose.Schema;
    const articleScheme = new Schema({
        id: { type: Number, index: true },
        created_at: { type: Date, default: Date.now },
        title: { type: String, required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        keywords: [String],
        preview: String,
        content: String,
        comments: [{
            user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            created_at: { type: Date, default: Date.now },
            content: String,
            ref_id: String,
            hide: { type: Boolean, default: true }
        }],
        draft: { type: Boolean, default: true },
        category: { type: String, ref: 'Category' },
    });

    articleScheme.index({ created_at: -1 });
    articleScheme.index({ user_id: 1 });

    articleScheme.pre('save', function (next) {
        for (let comment of this.comments) {
            if (comment.ref_id && !this.comments.id(comment.ref_id)) comment.remove();
        }
        next();
    })

    return mongoose.model('Article', articleScheme);
}