require('dotenv').config();
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from './routes/index';
import { authenticateToken } from './middlewares/auth';


const app = express();
const PORT = process.env.PORT || 9000;

app.use(helmet());
app.use(cors());
app.use(express.json())


// app.use((req, res, next) => {
//   if (authenticateToken(req, res, next)) {
//       // If the token is valid, proceed to the next middleware      
//       next();
//   } else {  
//       // If the token is invalid, send a 403 Forbidden response      
//       res.status(403).json({ message: 'Invalid token' });
//   }
// });


/*
 * This function is used to check the status of the server
 */
app.get('/status', function (req: Request, res: Response) {
    /*
      * #swagger.tags = ['Status']
      * #swagger.summary = 'Service Status'
      * #swagger.description = 'This route is used to check the status of the server.'
      * #swagger.responses[200] = { description: 'Success', schema: { status: true } }
   */
    res.json({ status: true });
});

app.use(router);

app.listen(PORT, async function () {
  console.log('Server listening on port ' + PORT);  
});