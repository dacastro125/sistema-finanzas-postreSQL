import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import compression from 'compression';
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import categoryRoutes from './routes/categoryRoutes';
import transactionRoutes from './routes/transactionRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import budgetRoutes from './routes/budgetRoutes';
import creditRoutes from './routes/creditRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});

// Rutas de la API registradas en el backend
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/credits', creditRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);

    // ─── Self-ping para evitar el cold start en Render ─────────────────────
    // Render duerme tras 15 min de inactividad. Nos pingamos cada 4 min.
    if (process.env.NODE_ENV === 'production') {
        const appUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        setInterval(async () => {
            try {
                const res = await fetch(`${appUrl}/api/health`);
                console.log(`[keep-alive] ping → ${res.status}`);
            } catch (err: any) {
                console.warn(`[keep-alive] ping failed: ${err.message}`);
            }
        }, 4 * 60 * 1000); // cada 4 minutos
        console.log(`[keep-alive] self-ping activo → ${appUrl}/api/health`);
    }
});
