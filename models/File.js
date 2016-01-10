'use strict'

module.exports = function (mongoose) {
    const Schema = mongoose.Schema;
    const fileScheme = new Schema({
        id: {type: Number, index: true},
        created_at: { type: Date, default: Date.now },
        name: { type: String, required: true },
        user_id: { type: Number, required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        ext: String
    });
    
    fileScheme.index({user_id: 1});
    
    return mongoose.model('File', fileScheme);
}