'use strict'

module.exports = function (mongoose) {
    const bcrypt = require('bcrypt'), Schema = mongoose.Schema;
    var userSchema = new Schema({
        id: { type: Number, index: true },
        name: { type: String, required: true },
        password: { type: String, required: true },
        phone: String,
        email: { type: String, required: true, index: { unique: true } },

        blog: {
            default_permission: [{
                _id: { type: Schema.Types.ObjectId, ref: 'Group' },
                read: { type: Boolean, default: true },
                comment: { type: Boolean, default: true },
                update: { type: Boolean, default: true },
                admin_comment: { type: Boolean, default: true }
            }]
        },
        group: { type: Schema.Types.ObjectId, ref: 'Group', required: true }
    });

    userSchema.pre('save', function (next) {
        let user = this;

        if (!user.isModified('password')) return next()
        bcrypt.hash(user.password, bcrypt.genSaltSync(), (err, hash) => {
            if (err) return next(err);
            user.password = hash;
            if (!user.blog.default_permission || user.blog.default_permission.count == 0) {
                user.blog.default_permission = [{
                    _id: 'default',
                    ead: true,
                    comment: true,
                    update: false,
                    admin_comment: false
                }];
            }
            next();
        });
    });

    userSchema.methods.isSuperUser = function () {
        return this.id == 0;
    }

    userSchema.methods.comparePassword = function (passwordToCompareWith, next) {
        bcrypt.compare(passwordToCompareWith, this.password, (err, valid) => {
            if (err) return next(err);
            next(null, valid);
        });
    };
    return mongoose.model('User', userSchema);
}