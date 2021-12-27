"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const TableName = "td_notes";
let user_id = "";
let user_name = "";
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
        return res.status(401).send({ message: "Unauthorized access", status: 401 });
    if (!AWS_COGNITO_ID_POOL)
        return res.status(401).send({ message: "Invalid access, 'ID_POOL' is missing", status: 401 });
    const decoded = (0, jwt_decode_1.default)(authorization);
    const identityCredentialsResponse = new aws_sdk_1.default.CognitoIdentityCredentials({
        // Identity Pool ID
        IdentityPoolId: AWS_COGNITO_ID_POOL,
        Logins: {
            'accounts.google.com': authorization
        }
    });
    identityCredentialsResponse.get(error => {
        user_id = identityCredentialsResponse.identityId;
        if (!user_id)
            return res.status(401).send({ message: 'Unauthorized access', status: 401 });
        user_name = decoded === null || decoded === void 0 ? void 0 : decoded.name;
        // Authentication successfull
        // Pass attributes through the middleware
        req.docClient = new dynamodb_1.DocumentClient();
        next();
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
    if (!id_token)
        return res.status(400).send({ message: "'id_token' is required", status: 400 });
    let tokenInfoEndpoint = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${id_token}`;
    let options = {
        url: tokenInfoEndpoint,
        method: 'GET'
    };
    (0, request_1.default)(options, ({ error, response, body }) => {
        if (response && response.statusCode) {
            return res.status(response.statusCode).send();
        }
        return res.status(400).send();
    });
});
/**
 * @description Create a new Note
 */
router.post('/api/note', withAuth, (req, res) => {
    const { docClient, body: { Item } } = req;
    if (!Item)
        return res.status(400).send({ message: "'Item' is required", status: 400 });
    Item.user_id = user_id;
    Item.user_name = user_name;
    Item.note_id = user_id + ':' + (0, uuid_1.v4)();
    Item.timestamp = (0, moment_1.default)().unix();
    Item.expires = (0, moment_1.default)().add(90, 'days').unix();
    docClient.put({
        TableName,
        Item
    }, (err, data) => {
        if (err)
            return res.status(err.statusCode || 500).send({ message: err.message || "Internal server error", status: err.statusCode });
        return res.status(200).send(Item);
    });
});
router.patch('/api/note', withAuth, (req, res, next) => {
    const { docClient, body: { Item } } = req;
    if (!Item)
        return res.status(400).send({ message: "'Item' is required", status: 400 });
    Item.user_id = user_id;
    Item.user_name = user_name;
    Item.expires = (0, moment_1.default)().add(90, 'days').unix();
    docClient.put({
        TableName,
        Item,
        ConditionExpression: '#t = :t',
        ExpressionAttributeNames: {
            '#t': 'timestamp'
        },
        ExpressionAttributeValues: {
            ':t': Item.timestamp
        }
    }, (err, data) => {
        if (err)
            return res.status(err.statusCode || 500).send({ message: err.message || "Internal server error", status: err.statusCode || 500 });
        return res.status(200).send(Item);
    });
});
router.get('/api/notes', withAuth, (req, res) => {
    const { docClient, query: { Limit, Start } } = req;
    if (!Limit)
        return res.status(400).send({ message: "'Limit' is required", status: 400 });
    if (!Start)
        return res.status(400).send({ message: "'Start' is required", status: 400 });
    if (isNaN(parseInt(Start)))
        return res.status(400).send({ message: "'Start' is not a number", status: 400 });
    let params = {
        TableName,
        KeyConditionExpression: "user_id = :uid",
        ExpressionAttributeValues: {
            ':uid': { "S": user_id }
        },
        Limit: Limit ? parseInt(Limit) : 5,
        ScanIndexForward: false // Sort the Items by timestamp
    };
    let startTimestamp = Start !== null && Start !== void 0 ? Start : 0;
    if (parseInt(startTimestamp) > 0) {
        params.ExclusiveStartKey = {
            user_id: { "S": user_id },
            timestamp: { "N": startTimestamp }
        };
    }
    docClient.query(params, (err, data) => {
        if (err)
            return res.status(err.statusCode || 500).send({ message: err.message, status: err.statusCode || 500 });
        return res.status(200).send(data);
    });
});
router.get('/api/note/:note_id', withAuth, (req, res) => {
    const { docClient, params: { note_id } } = req;
    if (!note_id)
        return res.status(400).send({ message: "'note_id' is required", status: 400 });
    if (isNaN(parseInt(note_id)))
        return res.status(400).send({ message: "'note_id' is not a number", status: 400 });
    let params = {
        TableName,
        IndexName: "note_id-index",
        KeyConditionExpression: "note_id = :note_id",
        ExpressionAttributeValues: {
            ":note_id": { "N": note_id }
        },
        Limit: 1
    };
    docClient.query(params, (err, data) => {
        if (err)
            return res.status(err.statusCode || 500).send({ message: err.message || "Internal server error", status: err.statusCode || 500 });
        if (underscore_1.default.isEmpty(data.Items) || !data.Items)
            return res.status(404).send({ message: "Entry not found", status: 404 });
        return res.status(200).send({ message: data.Items[0], status: 200 });
    });
});
router.delete('/api/note/:timestamp', (req, res) => {
    const { docClient, params: { timestamp } } = req;
    if (!timestamp)
        return res.status(400).send({ message: "'timestamp' is required", status: 400 });
    if (isNaN(parseInt(timestamp)))
        return res.status(400).send({ message: "'timestamp' must be a number", status: 400 });
    let params = {
        TableName,
        Key: {
            user_id: { "N": user_id },
            timestamp: { "N": timestamp }
        }
    };
    docClient.delete(params, (err, data) => {
        if (err)
            return res.status(err.statusCode || 500).send({ message: err.message || "Internal server error", status: err.statusCode || 500 });
        return res.status(200).send({ message: data, status: 200 });
    });
});
