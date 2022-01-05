import { NextFunction, Router, Request, Response } from 'express';
import request from 'request';
import jwtDecode, { JwtPayload } from 'jwt-decode';
import { v4 } from 'uuid';
import _ from 'underscore';
import moment from 'moment';
import AWS, { AWSError } from 'aws-sdk';
import {
  DocumentClient,
  QueryInput,
  QueryOutput,
  DeleteItemInput,
  DeleteItemOutput,
  PutItemInputAttributeMap,
} from 'aws-sdk/clients/dynamodb';
import { RequestWithBody } from './login-routes';

AWS.config.update({ region: 'us-east-1' });

const router = Router();

interface JwtDecodeWithName extends JwtPayload {
  name: string;
}

interface RequestWithItem extends RequestWithBody {
  body: {
    Item: PutItemInputAttributeMap;
  };
}

interface RequestResponse {
  error: any;
  response: request.Response;
  body: any;
}

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
const withAuth = (req: RequestWithItem, res: Response, next: NextFunction): Response | void => {
  const { authorization } = req.headers;
  const { AWS_COGNITO_ID_POOL } = process.env;

  if (!authorization) return res.status(401).send({ message: 'Unauthorized access', status: 401 });
  if (!AWS_COGNITO_ID_POOL)
    return res.status(401).send({ message: "Invalid access, 'ID_POOL' is missing", status: 401 });

  const decoded: JwtDecodeWithName = jwtDecode(authorization);
  const identityCredentialsResponse = new AWS.CognitoIdentityCredentials({
    // Identity Pool ID
    IdentityPoolId: AWS_COGNITO_ID_POOL,
    Logins: {
      'accounts.google.com': authorization,
    },
  });

  return identityCredentialsResponse.get((error): Response | void => {
    if (error) return res.status(500).send({ message: 'Internal server error', status: 500 });
    userId = identityCredentialsResponse.identityId;
    if (!userId) return res.status(401).send({ message: 'Unauthorized access', status: 401 });

    userName = decoded?.name;
    // Authentication successfull
    // Pass attributes through the middleware
    req.docClient = new DocumentClient();
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
router.post('/api/tokensignin', (req: RequestWithBody, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) return res.status(400).send({ message: "'id_token' is required", status: 400 });

  const tokenInfoEndpoint = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`;
  const options = {
    url: tokenInfoEndpoint,
    method: 'GET',
  };

  return request(options, ({ error, response, body }: RequestResponse): any => {
    if (error) return res.status(error ?? 500).send({ message: 'Internal server error. Request error.', status: 500 });
    if (response && response.statusCode)
      return res.status(response.statusCode).send({ message: response.statusMessage, status: response.statusCode });
    return res.status(400).send(body);
  });
});

/**
 * @description Create a new Note
 */
router.post('/api/note', withAuth, (req: RequestWithItem, res: Response): Response | undefined => {
  const {
    docClient,
    body: { Item },
  } = req;
  if (!Item) return res.status(400).send({ message: "'Item' is required", status: 400 });

  Item.userId = { S: userId };
  Item.userName = { S: userName };
  Item.note_id = { S: `${userId}:${v4()}` };
  Item.timestamp = { S: moment().unix().toString() };
  Item.expires = { S: moment().add(90, 'days').unix().toString() };

  return docClient.put(
    {
      TableName,
      Item,
    },
    (err: AWSError, data: DocumentClient.PutItemInput): Response => {
      if (err)
        return res
          .status(err.statusCode || 500)
          .send({ message: err.message || 'Internal server error', status: err.statusCode });
      return res.status(200).send(data);
    },
  );
});

router.patch('/api/note', withAuth, (req: RequestWithItem, res: Response, next: NextFunction): Response | undefined => {
  const {
    docClient,
    body: { Item },
  } = req;
  if (!Item) return res.status(400).send({ message: "'Item' is required", status: 400 });

  Item.userId = { S: userId };
  Item.userName = { S: userName };
  Item.expires = { S: moment().add(90, 'days').unix().toString() };

  return docClient.put(
    {
      TableName,
      Item,
      ConditionExpression: '#t = :t',
      ExpressionAttributeNames: {
        '#t': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':t': Item.timestamp,
      },
    },
    (err: AWSError, data: DocumentClient.PutItemOutput) => {
      if (err)
        return res
          .status(err.statusCode || 500)
          .send({ message: err.message || 'Internal server error', status: err.statusCode || 500 });
      return res.status(200).send(Item);
    },
  );
});

router.get('/api/notes', withAuth, (req: RequestWithBody, res: Response): Response | undefined => {
  const {
    docClient,
    query: { Limit, Start },
  } = req;
  if (!Limit) return res.status(400).send({ message: "'Limit' is required", status: 400 });
  if (!Start) return res.status(400).send({ message: "'Start' is required", status: 400 });
  if (Number.isNaN(parseInt(Start, 2)))
    return res.status(400).send({ message: "'Start' is not a number", status: 400 });

  const params: QueryInput = {
    TableName,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: {
      ':uid': { S: userId },
    },
    Limit: Limit ? parseInt(Limit, 2) : 5,
    ScanIndexForward: false, // Sort the Items by timestamp
  };

  const startTimestamp = Start ?? 0;
  if (parseInt(startTimestamp, 2) > 0) {
    params.ExclusiveStartKey = {
      userId: { S: userId },
      timestamp: { N: startTimestamp },
    };
  }

  return docClient.query(params, (err: AWSError, data: QueryOutput) => {
    if (err) return res.status(err.statusCode || 500).send({ message: err.message, status: err.statusCode || 500 });
    return res.status(200).send(data);
  });
});

router.get('/api/note/:noteId', withAuth, (req: RequestWithItem, res: Response): Response | undefined => {
  const {
    docClient,
    params: { noteId },
  } = req;
  if (!noteId) return res.status(400).send({ message: "'noteId' is required", status: 400 });
  if (Number.isNaN(parseInt(noteId, 2)))
    return res.status(400).send({ message: "'noteId' is not a number", status: 400 });

  const params: QueryInput = {
    TableName,
    IndexName: 'note_id-index',
    KeyConditionExpression: 'note_id = :note_id',
    ExpressionAttributeValues: {
      ':note_id': { N: noteId },
    },
    Limit: 1,
  };

  return docClient.query(params, (err: AWSError, data: QueryOutput) => {
    if (err)
      return res
        .status(err.statusCode || 500)
        .send({ message: err.message || 'Internal server error', status: err.statusCode || 500 });
    if (_.isEmpty(data.Items) || !data.Items) return res.status(404).send({ message: 'Entry not found', status: 404 });
    return res.status(200).send({ message: data.Items[0], status: 200 });
  });
});

router.delete('/api/note/:timestamp', (req: RequestWithItem, res: Response): Response | undefined => {
  const {
    docClient,
    params: { timestamp },
  } = req;
  if (!timestamp) return res.status(400).send({ message: "'timestamp' is required", status: 400 });
  if (Number.isNaN(parseInt(timestamp, 2)))
    return res.status(400).send({ message: "'timestamp' must be a number", status: 400 });
  const params: DeleteItemInput = {
    TableName,
    Key: {
      userId: { N: userId },
      timestamp: { N: timestamp },
    },
  };

  return docClient.delete(params, (err: AWSError, data: DeleteItemOutput) => {
    if (err)
      return res
        .status(err.statusCode || 500)
        .send({ message: err.message || 'Internal server error', status: err.statusCode || 500 });
    return res.status(200).send({ message: data, status: 200 });
  });
});
