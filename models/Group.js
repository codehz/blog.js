'use strict'

module.exports = function (mongoose) {
    let Schema = mongoose.Schema;
    let groupScheme = new Schema({
        _id: { type: String, index: { unique: true } },
        admin: { type: Boolean, default: false },
        blog: {
            create: { type: Boolean, default: false },
        }
    });
    
    groupScheme.virtual('name').get(function () {
        return this._id;
    })

    groupScheme.statics.setDefaultGroup = (user, cb) => {
        mongoose.model('Group').findOne({ _id: 'default' }, (err, group) => {
            if (err) throw err;
            if (!group) {
                let newGroup = mongoose.model('Group')({ _id: 'default' });
                newGroup.save((err, group) => {
                    if (err) throw err;
                    user.group = group;
                    cb();
                })
            } else {
                user.group = group;
                cb();
            }
        });
    };
    return mongoose.model('Group', groupScheme);
}