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
            TableName: 'global_td_notes',
            ConsistentRead: true,
            Limit: 3
        }

        if (!_.isEmpty(startKey)) {
            params.ExclusiveStartKey = startKey;
        }

        docClient.scan(params, (err, data) => {
            if (err) {
                console.log(err);
                // // We remove the Callback as it will reeult in the
                // // termination of our loop.
                // callback(err, {});
                callback(null, {});
            } else {
                if (typeof data.LastEvaluatedKey !== 'undefined') {
                    startKey = data.LastEvaluatedKey;
                } else {
                    startKey = [];
                }

                // // Commenting out the _.isEmpty statement
                // // because otherwise we won't be able to see the results.
                // // We don't want to combine the results.
                // if (!_.isEmpty(data.Items)) {
                //     results = _.union(results, data.Items);
                // }
                pages++;
                console.log(data.Items, "===> Page ", pages);

                callback(null, results);
            }
        });
    },

    //truth test
    () => { return true }, // We return true to have the LOOP run continuously.

    //callback
    (err, data) => {
        if (err) {
            console.log(err);
        } else {
            console.log('Pages: ', pages);
        }
    }
);