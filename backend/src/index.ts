// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRoutes from './routes/uploadRoutes';
import validationRoutes from './routes/validationRoutes';
import exceptionRoutes from './routes/exceptionRoutes';
import aiRoutes from './routes/aiRoutes';
import verificationRoutes from './routes/verificationRoutes';
import fraudRoutes from './routes/fraudRoutes';
import reportRoutes from './routes/reportRoutes';
import exportRoutes from './routes/exportRoutes';
import alertRoutes from './routes/alertRoutes';
import etlRoutes from './routes/etlRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/exceptions', exceptionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/etl', etlRoutes);


// Health check endpoint
app.get('/', (req, res) => {
  res.send('TrustTape API is running.');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

