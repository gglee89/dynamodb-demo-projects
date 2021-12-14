const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });

const docClient = new AWS.DynamoDB.DocumentClient();

const faker = require('faker');
const moment = require('moment');

setInterval(() => {
    let params = {
        TableName: 'global_td_notes'
    }

    generateNotesItem((item) => {
        params.Item = item;
        docClient.put(params, (err, data) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`Inserted: ` + item['user_name']);
            }
        })
    })
}, 300);

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