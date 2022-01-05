"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.router = router;
router.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email) {
        return res.status(400).send({ message: "'email' is invalid", status: 400 });
    }
    if (!password) {
        return res.status(400).send({ message: "'password' is invalid", status: 400 });
    }
    req.session = { loggedIn: true };
    return res.status(200).send({ message: 'logged-in' });
});
//# sourceMappingURL=login-routes.js.map