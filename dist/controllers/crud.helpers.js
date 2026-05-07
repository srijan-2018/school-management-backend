"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.getById = exports.create = exports.list = void 0;
const list = (model, key) => async (req, res, next) => {
    try {
        const rows = await model.findAll({ order: [["id", "DESC"]] });
        res.json({ [key]: rows });
    }
    catch (err) {
        next(err);
    }
};
exports.list = list;
const create = (model, key) => async (req, res, next) => {
    try {
        const row = await model.create(req.body ?? {});
        res.status(201).json({
            message: `${key} created successfully`,
            [key]: row,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.create = create;
const getById = (model, key) => async (req, res, next) => {
    try {
        const row = await model.findByPk(String(req.params.id));
        if (!row)
            return res.status(404).json({ message: `${key} not found` });
        res.json({ [key]: row });
    }
    catch (err) {
        next(err);
    }
};
exports.getById = getById;
const update = (model, key) => async (req, res, next) => {
    try {
        const row = await model.findByPk(String(req.params.id));
        if (!row)
            return res.status(404).json({ message: `${key} not found` });
        await row.update(req.body ?? {});
        res.json({ message: `${key} updated successfully`, [key]: row });
    }
    catch (err) {
        next(err);
    }
};
exports.update = update;
const remove = (model, key) => async (req, res, next) => {
    try {
        const row = await model.findByPk(String(req.params.id));
        if (!row)
            return res.status(404).json({ message: `${key} not found` });
        await row.destroy();
        res.json({ message: `${key} deleted successfully` });
    }
    catch (err) {
        next(err);
    }
};
exports.remove = remove;
