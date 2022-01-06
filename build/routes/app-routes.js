"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const request_1 = __importDefault(require("request"));
const jwt_decode_1 = __importDefault(require("jwt-decode"));
const uuid_1 = require("uuid");
const underscore_1 = __importDefault(require("underscore"));
const moment_1 = __importDefault(require("moment"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const dynamodb_1 = require("aws-sdk/clients/dynamodb");
aws_sdk_1.default.config.update({ region: 'us-east-1' });
const router = (0, express_1.Router)();
exports.router = router;
const TableName = 'td_notes';
let userId = '';
let userName = '';
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
    if (!authorization)
        return res.status(401).send({ message: 'Unauthorized access', status: 401 });
    if (!AWS_COGNITO_ID_POOL)
        return res.status(500).send({ message: "Invalid access, 'AWS_COGNITO_ID_POOL' is missing", status: 401 });
    const decoded = (0, jwt_decode_1.default)(authorization);
    const identityCredentialsResponse = new aws_sdk_1.default.CognitoIdentityCredentials({
        // Identity Pool ID
        IdentityPoolId: AWS_COGNITO_ID_POOL,
        Logins: {
            'accounts.google.com': authorization,
        },
    });
    return identityCredentialsResponse.get((error) => {
        if (error)
            return res.status(500).send({ message: 'Internal server error', status: 500 });
        userId = identityCredentialsResponse.identityId;
        if (!userId)
            return res.status(401).send({ message: 'Unauthorized access', status: 401 });
        userName = decoded === null || decoded === void 0 ? void 0 : decoded.name;
        // Authentication successfull
        // Pass attributes through the middleware
        req.docClient = new dynamodb_1.DocumentClient();
        return next();
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
    const { idToken } = req.body;
    if (!idToken)
        return res.status(400).send({ message: "'idToken' is required", status: 400 });
    const tokenInfoEndpoint = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`;
    request_1.default.get(tokenInfoEndpoint, (error, response, body) => {
        if (error)
            return res.status(error !== null && error !== void 0 ? error : 500).send({ message: 'Internal server error. Request error.', status: 500 });
        if (response && response.statusCode)
            return res.status(response.statusCode).send({ message: response.statusMessage, status: response.statusCode });
        return res.status(400).send(body);
    });
});
/**
 * @description Create a new Note
 */
router.post('/api/note', withAuth, (req, res) => {
    const { docClient, body: { Item }, } = req;
    if (!Item)
        return res.status(400).send({ message: "'Item' is required", status: 400 });
    Item.userId = { S: userId };
    Item.userName = { S: userName };
    Item.note_id = { S: `${userId}:${(0, uuid_1.v4)()}` };
    Item.timestamp = { S: (0, moment_1.default)().unix().toString() };
    Item.expires = { S: (0, moment_1.default)().add(90, 'days').unix().toString() };
    return docClient.put({
        TableName,
        Item,
    }, (err, data) => {
        if (err)
            return res
                .status(err.statusCode || 500)
                .send({ message: err.message || 'Internal server error', status: err.statusCode });
        return res.status(200).send(data);
    });
});
router.patch('/api/note', withAuth, (req, res) => {
    const { docClient, body: { Item }, } = req;
    if (!Item)
        return res.status(400).send({ message: "'Item' is required", status: 400 });
    Item.userId = { S: userId };
    Item.userName = { S: userName };
    Item.expires = { S: (0, moment_1.default)().add(90, 'days').unix().toString() };
    return docClient.put({
        TableName,
        Item,
        ConditionExpression: '#t = :t',
        ExpressionAttributeNames: {
            '#t': 'timestamp',
        },
        ExpressionAttributeValues: {
            ':t': Item.timestamp,
        },
    }, (err, data) => {
        if (err)
            return res
                .status(err.statusCode || 500)
                .send({ message: err.message || 'Internal server error', status: err.statusCode || 500 });
        return res.status(200).send(data);
    });
});
router.get('/api/notes', withAuth, (req, res) => {
    const { docClient, query: { Limit, Start }, } = req;
    if (!Limit)
        return res.status(400).send({ message: "'Limit' is required", status: 400 });
    if (!Start)
        return res.status(400).send({ message: "'Start' is required", status: 400 });
    if (Number.isNaN(parseInt(Start, 2)))
        return res.status(400).send({ message: "'Start' is not a number", status: 400 });
    const params = {
        TableName,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: {
            ':uid': { S: userId },
        },
        Limit: Limit ? parseInt(Limit, 2) : 5,
        ScanIndexForward: false, // Sort the Items by timestamp
    };
    const startTimestamp = Start !== null && Start !== void 0 ? Start : 0;
    if (parseInt(startTimestamp, 2) > 0) {
        params.ExclusiveStartKey = {
            userId: { S: userId },
            timestamp: { N: startTimestamp },
        };
    }
    return docClient.query(params, (err, data) => {
        if (err)
            return res.status(err.statusCode || 500).send({ message: err.message, status: err.statusCode || 500 });
        return res.status(200).send(data);
    });
});
router.get('/api/note/:noteId', withAuth, (req, res) => {
    const { docClient, params: { noteId }, } = req;
    if (!noteId)
        return res.status(400).send({ message: "'noteId' is required", status: 400 });
    if (Number.isNaN(parseInt(noteId, 2)))
        return res.status(400).send({ message: "'noteId' is not a number", status: 400 });
    const params = {
        TableName,
        IndexName: 'note_id-index',
        KeyConditionExpression: 'note_id = :note_id',
        ExpressionAttributeValues: {
            ':note_id': { N: noteId },
        },
        Limit: 1,
    };
    return docClient.query(params, (err, data) => {
        if (err)
            return res
                .status(err.statusCode || 500)
                .send({ message: err.message || 'Internal server error', status: err.statusCode || 500 });
        if (underscore_1.default.isEmpty(data.Items) || !data.Items)
            return res.status(404).send({ message: 'Entry not found', status: 404 });
        return res.status(200).send({ message: data.Items[0], status: 200 });
    });
});
router.delete('/api/note/:timestamp', (req, res) => {
    const { docClient, params: { timestamp }, } = req;
    if (!timestamp)
        return res.status(400).send({ message: "'timestamp' is required", status: 400 });
    if (Number.isNaN(parseInt(timestamp, 2)))
        return res.status(400).send({ message: "'timestamp' must be a number", status: 400 });
    const params = {
        TableName,
        Key: {
            userId: { N: userId },
            timestamp: { N: timestamp },
        },
    };
    return docClient.delete(params, (err, data) => {
        if (err)
            return res
                .status(err.statusCode || 500)
                .send({ message: err.message || 'Internal server error', status: err.statusCode || 500 });
        return res.status(200).send({ message: data, status: 200 });
    });
});
//# sourceMappingURL=app-routes.js.map