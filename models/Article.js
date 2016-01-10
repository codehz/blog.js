'use strict'

module.exports = function (mongoose) {
    const Schema = mongoose.Schema;
    const articleScheme = new Schema({
        id: { type: Number, index: true },
        created_at: { type: Date, default: Date.now },
        title: { type: String, required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        keywords: [String],
        content: String,
        comments: [{
            user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            content: String,
            ref_id: { type: Number, default: 0 },
            hide: { type: Boolean, default: true }
        }],
        draft: { type: Boolean, default: true },
    });

    articleScheme.index({ created_at: -1 });
    articleScheme.index({ user_id: 1 });
    
    return mongoose.model('Article', articleScheme);
}