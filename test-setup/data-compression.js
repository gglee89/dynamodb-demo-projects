const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });

const docClient = new AWS.DynamoDB.DocumentClient();

const faker = require('faker');
const moment = require('moment');
const zlib = require('zlib');

const generateNotesItem = (callback) => {
    callback({
        user_id: faker.datatype.uuid(),
        timestamp: moment().unix(),
        cat: faker.random.word(),
        title: faker.company.catchPhrase(),
        content: faker.hacker.phrase(),
        note_id: faker.datatype.uuid(),
        user_name: faker.internet.userName(),
        expires: moment().unix() + 600
    })
}

const putNotesItem = (item, callback) => {
    if (item.content.length > 35) {
        zlib.gzip(item.content,  (e, content_b) => {
            item.content_b = content_b;
            item.content = undefined;
            docClient.put({
                TableName: 'global_td_notes',
                Item: item
            }, callback)
        });
    } else {
        docClient.put({
            TableName: 'global_td_notes',
            Item: item
        }, callback)
    }
}
const getNotesItem = (key, callback) => {
    docClient.get({
        TableName: 'global_td_notes',
        Key: key
    }, (err, data ) => {
        if (err) callback(err)
        else {
            if (data.Item.content) {
                callback(null, data);
            } else {
                zlib.gunzip(data.Item.content_b, (err, content) => {
                    if (err) callback(err)
                    else {
                        data.Item.content = content.toString();
                        data.Item.content_b = undefined;
                        callback(null, data);
                    }
                })
            }
        }
    })
}

generateNotesItem((item) => {
    console.log("Incompressed item", item );
    putNotesItem(item, (err, data) => {
        if (err) console.log(err);
        else {
            console.log(data); 
            console.log("Incompressed item", item );
            getNotesItem({
                user_id: item.user_id,
                timestamp: item.timestamp
            }, (err, data) => {
                if (err) console.log(err);
                else {
                    console.log("Uncompressed data", data.Item);
                }
            })
        }
    })
})