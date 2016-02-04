'use strict'

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')()
        , fs = require('fs')
        , path = require('path');

    function fileResponse(file, _user) {
        let user = _user || file.user;
        return {
            id: file.id,
            name: file.name,
            user_id: user.id,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            ext: file.ext
        };
    }

    return {
        upload(req, res) {
            if (req.file && req.file.originalname) {
                let ext = path.extname(req.file.originalname);
                let tmp_path = req.file.path;
                db.Sequence.getNextSequence('files', (err, nextFileId) => {
                    if (err) return utils.error(res, 422, err);
                    let target_path = config.uploadPath + '/' + nextFileId + ext;
                    fs.copy(tmp_path, target_path, err => {
                        if (err) throw err;
                        fs.unlink(tmp_path, function () {
                            if (err) throw err;
                        });
                    });
                    const file = new db.File({
                        id: nextFileId,
                        name: req.file.originalname,
                        user: req.user,
                        ext,
                    });
                    file.save(err => err ?
                        utils.error(res, 422, err.message) :
                        utils.responseData(res, "update success!", fileResponse(file, req.user)));
                });
            } else {
                utils.error(res, 422, "Are you upload some files?");
            }
        },

        delete(req, res) {
            db.File.findOneAndRemove({ id: req.params.fileId }).populate('user').exec((err, file) => {
                if (err) return utils.error(res, 422, err);
                if (!file) return utils.error(res, 404);
                if (file.user.id != req.user.id) return utils.error(res, 403);
                let fileName = config.uploadPath + "/" + file.id + file.ext;
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
        },

        get(req, res) {
            const id = req.params.fileId;
            let query = {};
            let sortBy = null;

            if (id) {
                query = { id };
            } else {
                sortBy = {};
                sortBy["order_by"] = "created_at";
                sortBy["order_type"] = "desc";
                if (req.query.name) query["name"] = req.query.name;
                if (req.query.user_id) query["user.id"] = req.query.user_id;
                if (req.query.ext) query["ext"] = req.query.ext;
                if (req.query.order_by == "name") sortBy["order_by"] = "name";
                if (req.query.order_type === "asc") sortBy["order_type"] = req.query.order_type;
            }

            const queryRequest = db.File.find(query);

            if (sortBy) {
                var sort = {};
                sort[sortBy["order_by"]] = sortBy["order_type"] === "asc" ? "ascending" : "descending";
                queryRequest.sort(sort);
            }

            queryRequest.populate("user").exec((err, dbResponse) => {
                if (err) return utils.error(res, 422, err);
                if (!dbResponse) return utils.error(res, 404);
                utils.responseData(res, dbResponse.count, dbResponse.map(article => fileResponse(article)));
            })
        },

        redirect(req, res) {
            const id = req.params.fileId;
            db.File.findOne({id}, (err, file) => {
                if (err) return utils.error(res, 422, err);
                if (!file) return utils.error(res, 404);
                res.redirect(301, "http://" + config.host + (config.port == 80 ? "" : ":" + config.port)
                    + config.uploadDir + "/" + file.id + file.ext);
            })
        },
        setupPublic(Router) {
            const fileRouter = new Router();

            fileRouter.get('/redirect/:fileId', this.redirect);

            return fileRouter;
        },
        setup(Router, fileUpload) {
            const fileRouter = new Router();

            fileRouter.route('/file').get(this.get).post(utils.checkSuperUser, fileUpload.single('file'), this.upload);
            fileRouter.route('/file/:fileId').get(this.get).delete(utils.checkSuperUser, this.delete);

            return fileRouter;
        }
    }
}
