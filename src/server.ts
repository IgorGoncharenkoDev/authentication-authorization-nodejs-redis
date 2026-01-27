import http from 'node:http';
import dotenv from 'dotenv';

import app from './app';
import { connect } from './config/db';
import { chalkError, chalkSuccess } from './config/chalk';

dotenv.config();

async function startServer() {
  await connect();

  const server = http.createServer(app);

  const port = process.env.PORT || 5000;

  server.listen(port, () => {
    console.log(chalkSuccess(`Server is listening to port: ${ port }`));
  })
}

startServer().catch(err => {
  console.error(chalkError('Error when starting the server... :(', err));
  process.exit(1);
});