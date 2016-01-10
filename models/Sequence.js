'use strict'
/**
 * Sequence model (Start from 0)
 * @param mongoose
 * @author CodeHz
 * @returns {Model|*}
 */
module.exports = function (mongoose) {
    let Schema = mongoose.Schema;
    let sequenceSchema = new Schema({
        _id: { type: String, required: true, index: true },
        seq: { type: Number, default: -1 }
    });

    /**
     * Get next document id of collection
     * @param name Collection name
     * @param cb
     */
    sequenceSchema.statics.getNextSequence = (name, cb) => {
        mongoose.model('Seqs').findOneAndUpdate({ _id: name },
            { $inc: { seq: 1 } },
            { upsert: true },
            (err, idDoc) => cb && cb(err, idDoc.seq));
    };

    return mongoose.model('Seqs', sequenceSchema);
}