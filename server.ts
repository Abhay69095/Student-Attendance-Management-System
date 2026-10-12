import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRoutes from './server/routes/auth.js';
import studentRoutes from './server/routes/students.js';
import batchRoutes from './server/routes/batches.js';
import attendanceRoutes from './server/routes/attendance.js';
import reportRoutes from './server/routes/reports.js';
import teacherRoutes from './server/routes/teachers.js';
import settingsRoutes from './server/routes/settings.js';
import { seedInitialData } from './server/seed.js';
import { connectDatabase } from './server/db.js';

process.env.DISABLE_HMR = 'true';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Connect database (MongoDB Atlas or persistent local engine)
  await connectDatabase();

  // Seed default dataset if clean
  await seedInitialData();

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api', batchRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/attendance/reports', reportRoutes);
  app.use('/api/teachers', teacherRoutes);
  app.use('/api/settings', settingsRoutes);

  // Health route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'ClassAttend API', timestamp: new Date().toISOString() });
  });

  const httpServer = http.createServer(app);

  // Serve Vite frontend
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ClassAttend full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
  process.exit(1);
});
