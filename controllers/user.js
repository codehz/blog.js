'use strict'

module.exports = function (mongoose, config, db) {
    var jwt = require('jsonwebtoken'), utils = require('../lib/utils')();
    function userResponse(user) {
        return {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            superuser: user.isSuperUser()
        };
    }

    return {
        _check(req, cb) {
            var token = req.decoded;
            db.User.findOne({ _id: token._id }).populate('group').exec(function (err, user) {
                if (!user || err) return cb(null);
                return cb(user);
            });
        },
        current(req, res) {
            utils.responseData(res, req.user.name, userResponse(req.user));
        },
        updateCurrent(req, res) {
            let user = req.user;

            if (req.body.name) {
                req.checkBody('name').isAlpha();
                user.name = req.body.name;
            }
            if (req.body.email) {
                req.checkBody('email').isEmail();
                user.email = req.body.email;
            }
            if (req.body.phone) {
                req.checkBody('phone').isMobilePhone('zh-CN');
                user.phone = req.body.phone;
            }
            let error;
            if (error = req.validationErrors()) {
                return utils.validationError(res, error);
            }
            if (req.body.current_password) {
                // Check if current password right
                user.comparePassword(req.body.current_password, function (err, valid) {
                    if (!valid) return utils.error(res, 422, "Wrong current password", "current_password");
                    if (!req.body.new_password) {
                        return utils.error(res, 422, "Wrong new password", "new_password");
                    } else {
                        user.password = req.body.new_password;
                    }
                    saveUser(user, res);
                });
            } else {
                saveUser(user, res);
            }
            function saveUser(user, res) {
                user.save(function (err) {
                    if (err) return utils.error(res, 422, err.message);
                    return utils.success(res, userResponse(user));
                });
            }
        },
        login(req, res) {
            req.checkBody('email').notEmpty().isEmail();
            req.checkBody('password').notEmpty();
            let error;
            if (error = req.validationErrors()) {
                return utils.validationError(res, error);
            }

            db.User.findOne({
                email: req.body.email.toLowerCase()
            }, function (err, user) {
                if (err) throw err;

                if (!user) {
                    return utils.error(res, 422, "Wrong email", "email");
                } else {
                    // Check if password matches
                    user.comparePassword(req.body.password, function (err, valid) {
                        // If user is found and password is right - create token
                        if (!valid) return utils.error(res, 422, "Wrong password", "password");
                        let fakeUser = { id: user.id, _id: user._id };
                        let token = jwt.sign(fakeUser, config.secret, {
                            expiresIn: 3600 * 24 // 24 hours
                        });
                        utils.responseData(res, user.name, { token });
                    });
                }

            });
        },
        register(req, res) {
            req.checkBody('name').notEmpty().isAlpha();
            req.checkBody('phone').notEmpty().isMobilePhone('zh-CN');
            req.checkBody('email').notEmpty().isEmail();
            req.checkBody('password').notEmpty();
            var error;
            if (error = req.validationErrors()) {
                return utils.validationError(res, error);
            }

            // Need to retrieve a new user id
            db.Sequence.getNextSequence("users", function (err, nextUserId) {
                if (err) return utils.error(res, 422, err);

                var newUser = db.User({
                    id: nextUserId,
                    phone: req.body.phone,
                    name: req.body.name,
                    password: req.body.password,
                    email: req.body.email,
                    blog: {
                        default_permission: [{
                            _id: 'default',
                            read: true,
                            comment: true,
                            update: false,
                            admin_comment: false
                        }]
                    }
                });
                newUser.save(function (err, newUser) {
                    if (err) return db.Sequence.SequenceRollback("users", () => utils.error(res, 422, err.message));
                    let fakeUser = { id: newUser.id, _id: newUser._id };
                    var token = jwt.sign(fakeUser, config.secret, {
                        expiresIn: 3600 * 24// expires in 24 hours
                    });

                    return utils.responseData(res, fakeUser.name, { token });
                });
            });
        },
        getUser(req, res) {
            var query = {};
            if (req.params.userId) {
                req.checkParams('userId').isInt();
                // Search user via query param userId
                query = {
                    id: req.params.userId
                }
            } else {
                // Search user via query vars
                if (req.query.name) {
                    req.checkQuery('name').isAlpha();
                    query["name"] = req.query.name;
                }
                if (req.query.email) {
                    req.checkQuery('email').isEmail();
                    query["email"] = req.query.email;
                }
            }
            var error;
            if (error = req.validationErrors()) {
                return utils.validationError(res, error);
            }

            db.User.findOne(query, function (err, user) {
                if (err) throw err;
                if (!user) return utils.error(res, 404);
                return utils.success(res, userResponse(user));
            });
        },
        setupPublic(Router) {
            const userRouter = new Router();

            userRouter.post('/login', utils.requiredFields("email password"),
                utils.checkPassword, utils.validateEmail, this.login);
            userRouter.post('/register', utils.requiredFields("name password email phone"),
                utils.checkPassword, utils.validateEmail, utils.validatePhone, this.register);

            return userRouter;
        },
        setup(Router) {
            const userRouter = new Router();

            userRouter.param('userId', utils.requiredParams('userId'));
            userRouter.get('/me', this.current);
            userRouter.put('/me', this.updateCurrent);
            userRouter.get('/user/:userId?', utils.checkSuperUser, this.getUser);

            return userRouter;
        }
    }
}