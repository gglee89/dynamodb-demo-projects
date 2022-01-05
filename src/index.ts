import express, { Request, Response } from 'express'
import { router } from './routes/login-routes'
import bodyParser from 'body-parser'
import cookieSession from 'cookie-session'
import dotenv from 'dotenv'

const app = express()

dotenv.config()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieSession({ keys: ['lasdfk'] }))
app.use(router)

app.listen(5001, () => {
    console.log('listening on port 5001')
})