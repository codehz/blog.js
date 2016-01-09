/**
 * Copy From Demo Express RESTful API server(max) on 9.1.16.
 * Created by max on 28.11.15.
 */
module.exports = function () {
    const config = require('../config/config')
        , fs = require('fs')
        ;

    /**
     * Success response
     * @param res
     * @param data
     */
    function success(res, data) {
        res.status(200).send(data || {});
    }
    /**
     * Error response
     * @param res Response
     * @param code Error code
     * @param mes Error message
     * @param field Field name
     */
    function error(res, code, mes, field) {
        var resObj = {};
        if (mes) resObj["message"] = mes;
        if (field) resObj["field"] = field;
        res.status(code).send(resObj);
    }

    /**
     * Params validation error
     * @param res
     * @param obj
     * @returns {*}
     */
    function validationError(res, obj) {
        res.status(422).send(obj);
    }

    return {
        error: error,
        validationError: validationError,
        success: success,

        /**
         * Check required fields in request
         * @param requiredFields
         * @returns {Function}
         */
        requiredFields: function (requiredFields) {
            requiredFields = requiredFields.split(' ');
            return function (req, res, next) {
                var err = false, body = req.method == 'GET' ? req.query : req.body;
                requiredFields.forEach(function (param) { if (body[param] == undefined) err = true });
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

        /**
         * Save an item uploaded image to image directory,
         * build image url. Middleware function
         * @param req
         * @param res
         * @param next
         * @returns {*}
         */
        prepareItemUploadedImage: function (req, res, next) {
            if (req.file && req.file.originalname) {
                if (req.file.size >= config.fileUploadLimit) {
                    return error(res, 422, "The file " + req.file.originalname + " is too big", "image");
                }
                var imageSrc = "http://" + config.host + ":" +
                    config.port + config.uploadDir + "/" + req.file.originalname;

                var tmp_path = req.file.path;
                var target_path = req.file.destination + '/' + req.file.originalname;

                fs.rename(tmp_path, target_path, function (err) {
                    if (err) throw err;
                    fs.unlink(tmp_path, function () {
                        if (err) throw err;
                    });
                });
                req.body.imageSrc = imageSrc;
            }
            next();
        }
    }
};