'use strict'

module.exports = function (mongoose) {
    var Schema = mongoose.Schema;
    var articleScheme = new Schema({
        id         : Number,
        created_at : { type: Date, default: Date.now },
        title      : { type: String, required: true },
        user_id    : Number,
        user       : [{ type: Schema.Types.ObjectId, ref: 'User' }],
        keywords   : [String]
    });
    return mongoose.model('Article', articleScheme);
}