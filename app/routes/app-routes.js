const express = require('express');
const router = express.Router();
const _ = require('underscore');
const { v4 } = require('uuid');
const moment = require('moment');

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

docClient = new AWS.DynamoDB.DocumentClient();

const TableName = 'td_notes';
let user_id = 'test_user';
let user_name = 'Test User';

router.post('/api/note', (req, res, next) => {
    let Item = req.body.Item;
    Item.user_id = user_id;
    Item.user_name = user_name;
    Item.note_id = user_id + ':' + v4();
    Item.timestamp = moment().unix();
    Item.expires = moment().add(90, 'days').unix();

    docClient.put({
        TableName,
        Item
    }, (err, data) => {
        if (err) res.status(err.statusCode).send({message: err.message});
        
        res.status(200).send(Item);
    })
});

router.patch('/api/note', (req, res, next) => {
    let Item = req.body.Item;
    Item.user_id = user_id;
    Item.user_name = user_name;
    Item.expires = moment().add(90, 'days').unix();

    docClient.put({
        TableName,
        Item,
        ConditionExpression: '#t = :t' ,
        ExpressionAttributeNames: {
            '#t': 'timestamp'
        },
        ExpressionAttributeValues: {
            ':t': Item.timestamp
        }
    }, (err, data) => {
        if (err) res.status(err.statusCode).send({message: err.message, status: err.statusCode});
        
        res.status(200).send(Item);
    })
});

router.get('/api/notes', (req, res, next) => {
    const { Limit, Start } = req.query;
    let params = {
        TableName,
        KeyConditionExpression: "user_id = :uid",
        ExpressionAttributeValues: {
            ':uid': user_id
        },
        Limit: Limit ? parseInt(Limit) : 5,
        ScanIndexForward: false // Sort the Items by timestamp OR the sort_key in DESCENDING order
    };

    let startTimestamp = Start ? parseInt(Start) : 0;

    if (startTimestamp > 0) {
        params.ExclusiveStartKey = {
            user_id,
            timestamp: startTimestamp
        };                
    }

    docClient.query(params, (err, data) => {
        if (err) res.status(err.statusCode).send({ message: err.message, status: err.statusCode });

        res.status(200).send(data);
    })
})

router.get('/api/note/:note_id', (req, res, next) => {
    const { note_id } = req.params;

    if (!note_id) {
        return res.status(400).send({ message: "'note_id' is required", status: 400 });
    }

    let params = {
        TableName,
        IndexName: "note_id-index", 
        KeyConditionExpression: "note_id = :note_id",
        ExpressionAttributeValues: {
            ':note_id': note_id
        }
    };

    docClient.query(params, (err, data) => {
        if (err) res.status(err.statusCode).send({ message: err.message, status: err.statusCode });
        if (_.isEmpty(data.Items)) res.status(404).send({ message: `Not found - note_id: ${note_id}`, status: 404 });
        
        res.status(200).send(data.Items[0]);
    })
})

router.delete('/api/note/:timestamp', (req, res, next) => {
    const { timestamp } = req.params;

    if (!timestamp) {
        return res.status(400).send({ message: "'timestamp' is required", status: 400 });
    }

    let params = {
        TableName,
        Key: {
            user_id,
            timestamp: parseInt(timestamp)
        }
    }

    docClient.delete(params, (err, data) => {
        if (err) res.status(err.statusCode).send({ message: err.message, status: err.statusCode })

        res.status(200).send();
    })
})

module.exports = router;

