import express from 'express';
import cors from 'cors';
import { Database } from 'sqlite';
import { createVBRRoutes } from './routes/vbr.routes.js';
import { createSSHRoutes } from './routes/ssh.routes.js';
import { createScannerRoutes } from './routes/scanner.routes.js';
import { createNotificationsRoutes } from './routes/notifications.routes.js';
import { SERVER_CONFIG } from './config/server.config.js';
import { initializeDB } from './database.js';

const app = express();


app.use(cors());
app.use(express.json(SERVER_CONFIG.bodyParser));
app.use(express.urlencoded(SERVER_CONFIG.bodyParser));


app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});


async function initialize() {
  try {
    const db = await initializeDB();
    
    
    const apiRouter = express.Router();
    apiRouter.use('/vbr', createVBRRoutes(db));
    apiRouter.use('/ssh', createSSHRoutes(db));
    apiRouter.use('/scanner', createScannerRoutes(db));
    apiRouter.use('/notifications', createNotificationsRoutes(db));

    
    app.use('/api', apiRouter);

    
    app.use((err: Error, req: any, res: any, next: any) => {
      console.error('Server Error:', err);
      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });

    const PORT = Number(process.env.PORT || 3001);
    app.listen(PORT, 'localhost', () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

initialize();