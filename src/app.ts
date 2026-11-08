import express from 'express';
import { requestLogger } from './middleware/request-logger.js';
import helloRouter from './routes/hello.routes.js';
import productsRouter from './routes/products.routes.js';

const app = express();

app.use(express.json());
app.use(requestLogger);
app.use('/hello', helloRouter);
app.use('/products', productsRouter);

export default app;
