'use strict'

module.exports = function (mongoose) {
    const bcrypt = require('bcrypt'), Schema = mongoose.Schema;
    var userSchema = new Schema({
        id: Number,
        name: { type: String, required: true },
        password: { type: String, required: true },
        phone: String,
        email: { type: String, required: true, index: { unique: true } },
        permission: Number
    });

    userSchema.pre('save', function (next) {
        let user = this;
        if (!user.isModified('password')) return next();
        bcrypt.hash(user.password, bcrypt.genSaltSync(), (err, hash) => {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });

    userSchema.methods.comparePassword = function (passwordToCompareWith, next) {
        bcrypt.compare(passwordToCompareWith, this.password, (err, valid) => {
            if (err) return next(err);
            next(null, valid);
        });
    };
    return mongoose.model('User', userSchema);
}