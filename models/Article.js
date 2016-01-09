'use strict'

module.exports = function (mongoose) {
    const Schema = mongoose.Schema;
    const articleScheme = new Schema({
        id: Number,
        created_at: { type: Date, default: Date.now },
        title: { type: String, required: true },
        user_id: { type: Number, required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        keywords: [String],
        content: String
    });
    return mongoose.model('Article', articleScheme);
}