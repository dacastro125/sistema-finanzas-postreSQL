import { Response } from 'express';
import { AccountModel } from '../models/Account';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../utils/prisma';

export const getDashboardSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        // 1. Obtener parámetros de mes/año (0-indexed month)
        const { month, year } = req.query;
        const now = new Date();
        const currentMonth = month ? parseInt(month as string, 10) : now.getMonth();
        const currentYear = year ? parseInt(year as string, 10) : now.getFullYear();

        // Formato `YYYY-MM-`
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const yearStr = String(currentYear);
        const datePrefix = `${yearStr}-${monthStr}-`;

        // 2. Ejecutar consultas Prisma en PARALELO para exprimir la BD
        const [accounts, monthlyIncomes, monthlyExpenses, recentTransactions] = await Promise.all([
            AccountModel.findAllByUserId(userId),
            
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId, type: 'income', date: { startsWith: datePrefix } }
            }),
            
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId, type: 'expense', date: { startsWith: datePrefix } }
            }),

            prisma.transaction.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
                take: 5
            })
        ]);

        const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
        const monthlyIncome = monthlyIncomes._sum.amount || 0;
        const monthlyExpense = monthlyExpenses._sum.amount || 0;

        res.json({
            totalBalance,
            monthlyIncome,
            monthlyExpense,
            recentTransactions,
            accountsSummary: accounts.map(a => ({ id: a.id, name: a.name, balance: a.balance }))
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al obtener el resumen del dashboard' });
    }
};
