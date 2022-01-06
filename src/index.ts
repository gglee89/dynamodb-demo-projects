import express from 'express';
import { router } from './routes/app-routes';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import cors, { CorsRequest } from 'cors';

const app = express();

dotenv.config();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieSession({ keys: ['lasdfk'] }));
app.use(
  cors((req: CorsRequest, callback) => {
    let corsOptions = { origin: false };
    if (['http://localhost:3000'].indexOf(req.headers.origin || '') !== -1) corsOptions = { origin: true };
    return callback(null, corsOptions);
  }),
);
app.use(router);

app.listen(5001, () => {
  console.log('listening on port 5001');
});
