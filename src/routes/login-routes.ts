import { Router, Request, Response } from 'express';

export interface RequestWithBody extends Request {
  body: { [key: string]: string | object | undefined };
  query: { [key: string]: string };
  docClient?: any;
}

const router = Router();

router.post('/api/login', (req: RequestWithBody, res: Response) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).send({ message: "'email' is invalid", status: 400 });
  }

  if (!password) {
    return res.status(400).send({ message: "'password' is invalid", status: 400 });
  }

  req.session = { loggedIn: true };

  return res.status(200).send({ message: 'logged-in' });
});

export { router };
