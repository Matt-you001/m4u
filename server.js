/*import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

import creditRoutes from './routes/credits.js';
import userRoutes from './routes/user.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ROUTES
app.use('/user', userRoutes);
app.use('/credits', creditRoutes);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌ MongoDB error', err);
  });*/
