'use strict'

module.exports = function (mongoose) {
    let Schema = mongoose.Schema;
    let groupScheme = new Schema({
        name: { type: String, index: { unique: true } },
        admin: { type: Boolean, default: false },
        blog: {
            create: { type: Boolean, default: false },
        }
    });

    groupScheme.statics.setDefaultGroup = (user, cb) => {
        mongoose.model('Group').findOne({ name: 'default' }, (err, group) => {
            if (err) throw err;
            if (!group) {
                let newGroup = mongoose.model('Group')({ name: 'default' });
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