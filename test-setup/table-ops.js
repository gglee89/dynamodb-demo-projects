const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB();

/* 
 * AWS.DynamoDB
 *
 * For all the table-level operations.
 *
 * params = {
 *    ExclusiveStartTableName: 'STRING_VALUE',
 *    Limit: 0
 * } 
 * 
 * For this exercise, we can simply pass an empty params object.
 * This is because we're only evaluating one table.
 */

const params = {}
// dynamodb.listTables(params, (err, data) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(data);
//   }
// });


dynamodb.describeTable({
  TableName: 'td_notes_sdk'
}, (err, data) => {
  if (err) {
    console.log(err);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
});

// dynamodb.createTable({
//   TableName: 'td_notes_sdk',
//   AttributeDefinitions: [
//     {
//       AttributeName: "user_id",
//       AttributeType: "S"
//     },
//     {
//       AttributeName: "timestamp",
//       AttributeType: "N"
//     }
//   ],
//   KeySchema: [
//     {
//       AttributeName: "user_id",
//       KeyType: "HASH"
//     },
//     {
//       AttributeName: "timestamp",
//       KeyType: "RANGE"
//     }
//   ],
//   ProvisionedThroughput: {
//     ReadCapacityUnits: 1,
//     WriteCapacityUnits: 1
//   }
// }, (err, data) => {
//    if (err) {
//      console.log(err);
//    } else {
//      console.log(JSON.stringify(data, null, 2));
//    }
// });

// dynamodb.updateTable({
//   TableName: "td_notes_sdk",
//   ProvisionedThroughput: {
//     ReadCapacityUnits: 2,
//     WriteCapacityUnits: 1
//   }
// }, (err, data) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(JSON.stringify(data, null, 2));
//   }
// })