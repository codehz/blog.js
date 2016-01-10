'use strict'

module.exports = function (mongoose) {
    const Schema = mongoose.Schema;
    const articleScheme = new Schema({
        id: {type: Number, index: true},
        created_at: { type: Date, default: Date.now },
        title: { type: String, required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        keywords: [String],
        content: String
    });
    
    articleScheme.index({created_at: -1});
    articleScheme.index({user_id: 1});
    
    articleScheme.pre('remove', function (next) {
        this.model('Comment').remove({target_article_id: this.id}, next);
    })
    return mongoose.model('Article', articleScheme);
}