"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const request_1 = __importDefault(require("request"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
aws_sdk_1.default.config.update({ region: 'us-east-1' });
const router = (0, express_1.Router)();
/**
 * @description Takes in the `id_token` from the
 *              incoming request and sends it over to Google.
 * @param <String> id_token
 */
router.post('/api/tokensignin', (req, res, next) => {
    const { id_token } = req.body;
    let tokenInfoEndpoint = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${id_token}`;
    let options = {
        url: tokenInfoEndpoint,
        method: 'GET'
    };
    (0, request_1.default)(options, ({ error, response, body }) => {
        if (response && response.statusCode) {
            return res.status(response.statusCode).send();
        }
        // Bad Request
        return res.status(400).send();
    });
});
