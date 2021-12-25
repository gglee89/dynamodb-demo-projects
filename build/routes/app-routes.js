"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const request_1 = __importDefault(require("request"));
const jwt_decode_1 = __importDefault(require("jwt-decode"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
aws_sdk_1.default.config.update({ region: 'us-east-1' });
const router = (0, express_1.Router)();
/**
 * @description Run before each of our API requests
 *              and tries to fetch the AWS credentials
 * @param req <Request>
 * @param res <Response>
 * @param next <Next>
 */
const withAuth = (req, res, next) => {
    const { authorization } = req.headers;
    const { AWS_COGNITO_ID_POOL } = process.env;
    if (!authorization) {
        return res.status(401).send({ message: "Unauthorized access", status: 401 });
    }
    if (!AWS_COGNITO_ID_POOL) {
        return res.status(401).send({ message: "Invalid access, 'ID_POOL' is missing", status: 401 });
    }
    const decoded = (0, jwt_decode_1.default)(authorization);
    aws_sdk_1.default.config.credentials = new aws_sdk_1.default.CognitoIdentityCredentials({
        // Identity Pool ID
        IdentityPoolId: AWS_COGNITO_ID_POOL,
        Logins: {
            'accounts.google.com': authorization
        }
    });
};
/**
 * @description Takes in the `id_token` from the
 *              incoming request and sends it over to Google
 *              to decide whether the user is logged in or NOT.
 *
 *              NEXT, for every other API request that needs to talk to
 *              DynamoDB, we have to get the temporary access.
 *
 *              To do that, we're using a custom made MIDDLEWARE
 *              like `body-parser` which converts incoming
 *              requests to JSON.
 * @param <String> id_token
 */
router.post('/api/tokensignin', (req, res) => {
    const { id_token } = req.body;
    if (!id_token) {
        return res.status(400).send({ message: "'id_token' is required", status: 400 });
    }
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
