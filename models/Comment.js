'use strict'

module.exports = function (mongoose) {
    const Schema = mongoose.Schema;
    const commentScheme = new Schema({
        id: Number,
        created_at: { type: Date, default: Date.now },
        user_id: { type: Number, required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        target_article_id: { type: Number, required: true },
        target_article: { type: Schema.Types.ObjectId, ref: 'Article' },
        target_id: { type: Number, default: 0 },
        target: { type: Schema.Types.ObjectId, ref: 'Comment' },
        content: { type: String, required: true }
    });
    return mongoose.model('Comment', commentScheme);
}