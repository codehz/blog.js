/**
 * Sequence model
 * @param mongoose
 * @author Max Plavinskiy
 * @returns {Model|*}
 */
module.exports = function(mongoose) {
    var Schema = mongoose.Schema;
    var sequenceSchema = new Schema({
        _id: { type: String, required: true },
        seq: { type: Number, default: 0 }
    });

    /**
     * Get next document id of collection
     * @param name Collection name
     * @param cb
     */
    sequenceSchema.statics.getNextSequence = (name, cb) => {
        mongoose.model('Seqs').findOneAndUpdate(
            { _id: name },
            { $inc:   { seq: 1 } },
            { upsert: true },
            (err, idDoc) => {
                cb && cb(err, idDoc.seq);
            }
        );
    };

    return mongoose.model('Seqs', sequenceSchema);
}