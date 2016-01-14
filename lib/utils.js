/**
 * Copy From Demo Express RESTful API server(max) on 9.1.16.
 * Created by max on 28.11.15.
 */
module.exports = function () {
    function genResponse(status, message, body) {
        return body ? { status, message, body } : { status, message };
    }
    
    /**
     * Success response
     * @param res
     * @param data
     */
    function success(res, message) {
        res.status(200).send(genResponse(true, message));
    }
    
    /**
     * data
     * @param res
     * @param message
     * @param data 
     */
    function responseData(res, message, data) {
        res.status(200).send(genResponse(true, message, data));
    }
    
    /**
     * Error response
     * @param res Response
     * @param code Error code
     * @param mes Error message
     * @param field Field name
     */
    function error(res, code, message, field) {
        if (!message) {
            switch (code) {
                case 404:
                    message = "Not Found";
                    break;
                case 403:
                    message = "Forbidden";
                    break;
                case 422:
                    message = "Unprocessable Entity";
                    break;
                default:
                    message = Math.ceil(code / 100) == 5 ? "Internal Server Error" : "Error";
            }
        }
        res.status(code).send(genResponse(false, message, field));
    }

    /**
     * Params validation error
     * @param res
     * @param obj
     * @returns {*}
     */
    function validationError(res, obj) {
        res.status(422).send(genResponse(false, obj));
    }

    return {
        error,
        validationError,
        success,
        responseData,

        /**
         * Check required fields in request
         * @param requiredFields
         * @returns {Function}
         */
        requiredFields: function (requiredFields) {
            requiredFields = requiredFields.split(' ');
            return function (req, res, next) {
                var err = false, body = req.method == 'GET' ? req.query : req.body.data;
                if (!body) return error(res, 400, 'Requires JSON body: ' + requiredFields.join(', '));
                requiredFields.forEach((param) => body[param] == undefined ? err = true : null);
                return err ? error(res, 422, 'Requires params: ' + requiredFields.join(', ')) : next();
            }
        },

        /**
         * Ensure req.body.password is valid. Middleware function
         * @param req
         * @param res
         * @param next
         * @returns {*}
         */
        checkPassword: function (req, res, next) {
            req.checkBody("password").notEmpty().len(6, 20);
            var error;
            if (error = req.validationErrors()) {

                return validationError(res, error);
            }
            next();
        },

        /**
         * Ensure req.body.email is valid. Middleware function
         * @param req
         * @param res
         * @param next
         * @returns {*}
         */
        validateEmail(req, res, next) {
            var error;
            req.checkBody("email").notEmpty().isEmail();
            if (error = req.validationErrors()) {
                return validationError(res, error);
            }
            next();
        },

        validatePhone(req, res, next) {
            var error;
            req.checkBody("phone").notEmpty().isMobilePhone('zh-CN');
            if (error = req.validationErrors()) {
                return validationError(res, error);
            }
            next();
        },

        requiredParams(name) {
            return (req, res, next) => {
                var error;
                req.checkParams(name).notEmpty();
                if (error = req.validationErrors()) {
                    return validationError(res, error);
                }
                next();
            }
        },

        checkSuperUser(req, res, next) {
            if (req.user.isSuperUser()) return next();
            error(res, 403);
        },
        
        genCheckToken(jwt, app, UserController) {
            return (req, res, next) => {
            // Check header for token
            var token = req.headers['authorization'];

            // Decode token
            if (token) {
                jwt.verify(token, app.get('secret'), (err, decoded) => {
                    if (err) {
                        return error(res, 401, err);
                    } else {
                        // Save to request for use in other routes
                        req.decoded = decoded;
                        UserController._check(req, user => {
                            if (user) {
                                req.user = user;
                                //console.log("Checked", user.name, user.email);
                                next();
                            } else error(res, 401, "Token Check failed!");
                        })
                    }
                });
            } else {
                // No token - unauthorized
                return error(res, 401, "No Token");
            }
        }
        }
    }
};