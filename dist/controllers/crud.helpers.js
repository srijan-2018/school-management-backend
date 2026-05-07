"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.getById = exports.create = exports.list = void 0;
const list = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield model.findAll({ order: [["id", "DESC"]] });
        res.json({ [key]: rows });
    }
    catch (err) {
        next(err);
    }
});
exports.list = list;
const create = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const row = yield model.create((_a = req.body) !== null && _a !== void 0 ? _a : {});
        res.status(201).json({
            message: `${key} created successfully`,
            [key]: row,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.create = create;
const getById = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const row = yield model.findByPk(String(req.params.id));
        if (!row)
            return res.status(404).json({ message: `${key} not found` });
        res.json({ [key]: row });
    }
    catch (err) {
        next(err);
    }
});
exports.getById = getById;
const update = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const row = yield model.findByPk(String(req.params.id));
        if (!row)
            return res.status(404).json({ message: `${key} not found` });
        yield row.update((_a = req.body) !== null && _a !== void 0 ? _a : {});
        res.json({ message: `${key} updated successfully`, [key]: row });
    }
    catch (err) {
        next(err);
    }
});
exports.update = update;
const remove = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const row = yield model.findByPk(String(req.params.id));
        if (!row)
            return res.status(404).json({ message: `${key} not found` });
        yield row.destroy();
        res.json({ message: `${key} deleted successfully` });
    }
    catch (err) {
        next(err);
    }
});
exports.remove = remove;
