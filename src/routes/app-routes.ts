import { Router, Request, Response } from 'express'
import request from 'request'

import AWS from 'aws-sdk'
AWS.config.update({ region: 'us-east-1' })

const router = Router()

interface RequestResponse {
    error: any;
    response: request.Response;
    body: any
}

/**
 * @description Takes in the `id_token` from the
 *              incoming request and sends it over to Google.
 * @param <String> id_token
 */
router.post('/api/tokensignin', (req, res, next) => {
    const { id_token } = req.body

    let tokenInfoEndpoint = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${id_token}`

    let options = {
        url: tokenInfoEndpoint,
        method: 'GET'
    }

    request(options, ({ error, response, body }: RequestResponse): any => {
        if (response && response.statusCode) {
            return res.status(response.statusCode).send();
        }

        // Bad Request
        return res.status(400).send();
    })  
})