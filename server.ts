import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes/api';
import { db } from './server/db/database';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Increase payload limits for high-resolution document and PDF uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // Seed sample initial transactions if empty so user has immediate rich test experience
  seedInitialTestBankData();

  // Mount API routes FIRST
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AI Finance Assistant Server',
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Finance Assistant Server running at http://0.0.0.0:${PORT}`);
  });
}

function seedInitialTestBankData() {
  try {
    const company = db.getActiveCompany();
    const bankAccounts = db.getBankAccounts(company.id);
    if (bankAccounts.length > 0) {
      const existingTx = db.getBankTransactions(bankAccounts[0].id);
      if (existingTx.length === 0) {
        // Add sample bank statement lines
        const today = new Date().toISOString().split('T')[0];
        db.createBankTransaction({
          bankAccountId: bankAccounts[0].id,
          date: today,
          description: 'NEFT-AXIS-ABC TECH CONSULTANTS-INV8841',
          referenceNumber: 'CMS982310892',
          type: 'DEBIT',
          amount: 70200,
          status: 'Unmatched',
        });
        db.createBankTransaction({
          bankAccountId: bankAccounts[0].id,
          date: today,
          description: 'RTGS-APEX CLOUD SERVICES-BENGALURU',
          referenceNumber: 'UTR2024092001',
          type: 'DEBIT',
          amount: 48720,
          status: 'Unmatched',
        });
      }
    }
  } catch (err) {
    console.error('Error seeding bank data:', err);
  }
}

startServer();
