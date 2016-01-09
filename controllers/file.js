'use strict'

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')()
        , fs = require('fs')
        , path = require('path');

    function fileResponse(file) {
        return {
            id: file.id,
            name: file.name,
            user_id: file.user_id,
            user: {
                id: file.user.id,
                email: file.user.email,
                name: file.user.name
            },
            path: file.path
        };
    }

    return {
        upload(req, res) {
            if (req.file && req.file.originalname) {
                if (req.file.size >= config.fileUploadLimit) {
                    return utils.error(res, 422, "The file " + req.file.originalname + " is too big", "image");
                }
                let ext = path.extname(req.file.originalname);
                let tmp_path = req.file.path;
                db.Sequence.getNextSequence('files', (err, nextFileId) => {
                    if (err) return utils.error(res, 422, err);
                    let target_path = req.file.destination + '/' + nextFileId + ext;
                    fs.rename(tmp_path, target_path, err => {
                        if (err) throw err;
                        fs.unlink(tmp_path, function () {
                            if (err) throw err;
                        });
                    });
                    const file = new db.File({
                        id: nextFileId,
                        name: req.file.originalname,
                        user_id: req.user.id,
                        user: req.user,
                        path: nextFileId + ext
                    });
                    file.save(err => err ?
                        utils.error(res, 422, err.message) :
                        utils.responseData(res, "update success!", fileResponse(file)));
                });
            } else {
                utils.error(res, 422, "Are you upload some files?");
            }
        },

        delete(req, res) {
            db.File.findOne({ id: req.params.fileId, user_id: req.user.id })
                .exec((err, file) => {
                    if (err) return utils.error(res, 422, err);
                    if (!file) return utils.error(res, 404);
                    if (file.user_id != req.user.id) return utils.error(res, 403, "Forbidden");
                    let fileName = config.uploadPath + "/" + file.path
                    fs.exists(fileName, exists => {
                        if (exists) {
                            fs.unlink(fileName, err => err ?
                                utils.error(res, 422, err) :
                                utils.success(res, "delete successful!"));
                        } else {
                            utils.error(res, 404);
                        }
                    });
                });
        }
    }
}