import { NextFunction, Router, Request, Response } from 'express'
import { RequestWithBody } from './login-routes'
import request from 'request'
import jwtDecode from 'jwt-decode'

import AWS from 'aws-sdk'
AWS.config.update({ region: 'us-east-1' })

const router = Router()

interface RequestResponse {
    error: any;
    response: request.Response;
    body: any
}

/**
 * @description Run before each of our API requests
 *              and tries to fetch the AWS credentials
 * @param req <Request>
 * @param res <Response>
 * @param next <Next>
 */
const withAuth = (req: RequestWithBody, res: Response, next: NextFunction) => {
    const { authorization } = req.headers
    const { AWS_COGNITO_ID_POOL } = process.env

    if (!authorization) {
        return res.status(401).send({ message: "Unauthorized access", status: 401 })
    }

    if (!AWS_COGNITO_ID_POOL) {
        return res.status(401).send({ message: "Invalid access, 'ID_POOL' is missing", status: 401 })
    }

    const decoded = jwtDecode(authorization)

    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        // Identity Pool ID
        IdentityPoolId: AWS_COGNITO_ID_POOL,
        Logins: {
            'accounts.google.com': authorization
        }
    })
}

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
    const { id_token } = req.body

    if (!id_token) {
        return res.status(400).send({ message: "'id_token' is required", status: 400 })
    }

    let tokenInfoEndpoint = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${id_token}`

    let options = {
        url: tokenInfoEndpoint,
        method: 'GET'
    }

    request(options, ({ error, response, body }: RequestResponse): any => {
        if (response && response.statusCode) {
            return res.status(response.statusCode).send()
        }

        // Bad Request
        return res.status(400).send()
    })    
})

