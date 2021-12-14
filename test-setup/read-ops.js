const AWS = require("aws-sdk");
AWS.config.update({ region: 'us-east-1' });

const docClient = new AWS.DynamoDB.DocumentClient();

// docClient.get({
//     TableName: 'td_notes_sdk',
//     Key: {
//         user_id: 'A',
//         timestamp: 1
//     }
// }, (err, data) => {
//     if (err) {
//       console.log(err);
//     } else {
//       console.log(data);
//     }
//   })

// docClient.query({
//     TableName: 'td_notes_sdk',
//     KeyConditionExpression: "user_id = :uid",
//     ExpressionAttributeValues: {
//         ':uid': 'ABC'
//     }
// }, (err, data) => {
//     if (err) {
//       console.log(err);
//     } else {
//       console.log(data);
//     }
// })

// docClient.scan({
//     TableName: 'td_notes_sdk',
//     FilterExpression: "cat = :cat",
//     ExpressionAttributeValues: {
//         ":cat": "general"
//     }
// }, (err, data) => {
//     if (err) {
//       console.log(err);
//     } else {
//       console.log(data);
//     }
// })

docClient.batchGet({
    RequestItems: {
        'td_notes': {
            Keys: [
                {
                    user_id: '3746jjfd',
                    timestamp: 16389498688
                }                
            ]
        },
        'td_notes_sdk': {
            Keys: [
                {
                    user_id: 'ABC',
                    timestamp: 1
                },
                {
                    user_id: '22',
                    timestamp: 1
                }                
            ]
        }
    }
}, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
})