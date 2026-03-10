import { Response } from 'express';
import { AccountModel } from '../models/Account';
import { TransactionModel } from '../models/Transaction';
import { AuthRequest } from '../middleware/authMiddleware';

export const getDashboardSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        // 1. Obtener todas las cuentas y calcular saldo total
        const accounts = await AccountModel.findAllByUserId(userId);
        const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

        // 2. Obtener las transacciones del usuario
        const transactions = await TransactionModel.findAllByUserId(userId);

        // 3. Obtener parámetros de mes/año o usar actuales
        const { month, year } = req.query;
        const now = new Date();
        const currentMonth = month ? parseInt(month as string, 10) : now.getMonth();
        const currentYear = year ? parseInt(year as string, 10) : now.getFullYear();

        // Filtrar transacciones del mes
        const monthlyTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        });

        // 4. Calcular ingresos y gastos mensuales
        const monthlyIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlyExpense = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        // 5. Devolver listado (ej. últimas 5 transacciones)
        // Ya están ordenadas de más recientes a viejas según findAllByUserId en Prisma
        const recentTransactions = transactions.slice(0, 5);

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
