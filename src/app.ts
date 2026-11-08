import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import helloRouter from './routes/hello.routes.js';
import productsRouter from './routes/products.routes.js';

const app = express();

// Logger dipasang sebelum express.json() agar request dengan body JSON rusak (400) juga tercatat.
app.use(requestLogger);
app.use(express.json());
app.use('/hello', helloRouter);
app.use('/products', productsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
