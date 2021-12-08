const AWS = require("aws-sdk");
AWS.config.update({ region: 'us-east-1' });

const docClient = new AWS.DynamoDB.DocumentClient();


/**
 * Conditional writes:
 * - Are IDEMPOTENT
 *   i.e. If you make the same conditional write request to DynamoDB
 *        multiple times, ONLY the FIRST request will be considered.
 * - Returns ConditionalCheckFailedException if condition fails
 * - WCUs are still consumed
 */

// Write the item to the table IF 
// timestamp = 1
// does NOT exist for this particular user_id = 'ABD'
docClient.put({
    TableName: 'td_notes_sdk',
    Item: {
        user_id: 'ABC',
        timestamp: 1,
        title: 'New Title',
        content: 'New Content'
    },
    ConditionExpression: '#t <> :t',
    ExpressionAttributeNames: {
        '#t': 'timestamp'
    },
    ExpressionAttributeValues: {
        ':t': 1
    }
}, (err, data) => {
    if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
})