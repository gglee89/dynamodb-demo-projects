const async = require("async");
const _ = require('underscore');
const AWS = require("aws-sdk");
AWS.config.update({ region: 'us-east-1' });

const docClient = new AWS.DynamoDB.DocumentClient();

let startKey = [];
let results = [];
let pages = 0

async.doWhilst(
    //iterate
    (callback) => {
        let params = {
            TableName: 'td_notes_sdk',
            Limit: 3
        }

        if (!_.isEmpty(startKey)) {
            params.ExclusiveStartKey = startKey;
        }

        docClient.scan(params, (err, data) => {
            if (err) {
                console.log(err);
                callback(err, {});
            } else {
                if (typeof data.LastEvaluatedKey !== 'undefined') {
                    startKey = data.LastEvaluatedKey;
                } else {
                    startKey = [];
                }

                if (!_.isEmpty(data.Items)) {
                    results = _.union(results, data.Items);
                }

                pages++;

                callback(null, results);
            }
        });
    },

    //truth test
    () => !_.isEmpty(startKey),

    //callback
    (err, data) => {
        if (err) {
            console.log(err);
        } else { 
            console.log(data);
            console.log('Item Count: ', data.length);
            console.log('Pages: ', pages);
        }
    }
);