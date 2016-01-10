'use strict'

module.exports = function (mongoose, config, db) {
    const utils = require('../lib/utils')();

    return {
        _checkPermission(req, res, next) {
            if (!req.user.isSuperUser()
                || req.user.group.admin)
                return utils.error(res, 403);
            next();
        },

        _getGroup(req, res, next) {
            db.Group.findById(req.params.groupId, (err, group) => {
                if (err) return utils.error(res, 422, err);
                if (!group) return utils.error(res, 404);
                req.group = group;
                next();
            });
        },

        getSingle(req, res) {
            utils.responseData(res, req.group.name, req.group);
        },

        getAll(req, res) {
            db.Group.find().exec((err, groups) => {
                utils.responseData(res, groups.count, groups);
            })
        },

        update(req, res) {
            if (req.body.admin) req.group.admin = req.body.admin;
            if (req.body.blog) {
                try {
                    req.group.blog = JSON.parse(req.body.blog);
                } catch (err) {
                    return utils.error(res, 422, err);
                }
            }
            if (req.body.common) {
                try {
                    req.group.common = JSON.parse(req.body.common);
                } catch (err) {
                    return utils.error(res, 422, err);
                }
            }
            req.group.save(err => err ? utils.error(res, 422, err) : utils.success(res, "update successful"));
        },
        
        delete(req, res) {
            req.group.remove(err => err ? utils.error(res, 422, err) : utils.success(res, "delete successful"));
        },

        create(req, res) {
            let blog = {};
            let common = {};
            try {
                blog = JSON.parse(req.body.blog);
                common = JSON.parse(req.body.common);
            } catch (err) {
                return utils.error(res, 422, err);
            }
            let newGroup = new db.Group({
                _id: req.params.groupId,
                admin: !!req.body.admin,
                blog,
                common
            });
            newGroup.save(err => err ? utils.error(res, 422, err) : utils.success(res, "update successful"));
        }
    }
}