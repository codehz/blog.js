'use strict'

module.exports = function (mongoose) {
    const Schema = mongoose.Schema;
    const commentScheme = new Schema({
        id: {type: Number, index: true},
        created_at: { type: Date, default: Date.now },
        user_id: { type: Number, required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        target_article_id: { type: Number, required: true },
        target_article: { type: Schema.Types.ObjectId, ref: 'Article' },
        target_id: { type: Number, default: 0 },
        target: { type: Schema.Types.ObjectId, ref: 'Comment' },
        content: { type: String, required: true }
    });
    
    commentScheme.index({id: 1});
    commentScheme.index({created_at: -1});
    commentScheme.index({target_article_id: 1});
    commentScheme.index({target_id: 1});
    
    commentScheme.pre('remove', function (next) {
        this.model('Comment').remove({target_id: this.id}, next);
    });
    return mongoose.model('Comment', commentScheme);
}