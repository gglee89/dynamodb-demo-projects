"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app_routes_1 = require("./routes/app-routes");
const cookie_session_1 = __importDefault(require("cookie-session"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.use((0, cookie_session_1.default)({ keys: ['lasdfk'] }));
app.use((0, cors_1.default)((req, callback) => {
    let corsOptions = { origin: false };
    if (['http://localhost:3000'].indexOf(req.headers.origin || '') !== -1)
        corsOptions = { origin: true };
    return callback(null, corsOptions);
}));
app.use(app_routes_1.router);
app.listen(5001, () => {
    console.log('listening on port 5001');
});
//# sourceMappingURL=index.js.map