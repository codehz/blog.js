'use strict'

module.exports = function (mongoose) {
    const bcrypt = require('bcrypt'), Schema = mongoose.Schema;
    var userSchema = new Schema({
        id: { type: Number, index: true },
        name: { type: String, required: true },
        password: { type: String, required: true },
        phone: String,
        email: {
            type: String,
            pattern: /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i,
            lowercase: true,
            trim: true,
            required: true,
            index: { unique: true }
        },
    });

    userSchema.pre('save', function (next) {
        let user = this;

        if (!user.isModified('password')) return next()
        bcrypt.hash(user.password, bcrypt.genSaltSync(), (err, hash) => {
            if (err) return next(err);
            user.password = hash;
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