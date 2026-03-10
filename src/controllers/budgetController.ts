import { Response } from 'express';
import { BudgetModel } from '../models/Budget';
import { TransactionModel } from '../models/Transaction';
import { CategoryModel } from '../models/Category';
import { AuthRequest } from '../middleware/authMiddleware';

export const getBudgetsWithProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        const budgets = await BudgetModel.findAllByUserId(userId);
        const allCategories = await CategoryModel.findAllByUserId(userId);
        const categories = allCategories.filter(c => c.type === 'expense');

        // Obtener gastos del mes actual
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const allTransactions = await TransactionModel.findAllByUserId(userId);
        const monthlyExpenses = allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return t.type === 'expense' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        });

        // Construir la respuesta con el progreso
        const results = categories.map(cat => {
            const budget = budgets.find(b => b.categoryId === cat.id);
            const limitAmount = budget ? budget.limitAmount : 0;

            const spentAmount = monthlyExpenses
                .filter(t => t.categoryId === cat.id)
                .reduce((sum, t) => sum + t.amount, 0);

            const percentage = limitAmount > 0 ? Math.min((spentAmount / limitAmount) * 100, 100) : 0;

            return {
                categoryId: cat.id,
                categoryName: cat.name,
                color: cat.color,
                budgetId: budget ? budget.id : null,
                limitAmount,
                spentAmount,
                percentage
            };
        });

        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al obtener presupuestos' });
    }
};

export const upsertBudget = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { categoryId, limitAmount } = req.body;

        if (!categoryId || limitAmount === undefined) {
            res.status(400).json({ error: 'Faltan campos (categoryId, limitAmount)' });
            return;
        }

        const budget = await BudgetModel.upsert(userId, categoryId, Number(limitAmount));
        res.status(200).json(budget);
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al guardar presupuesto' });
    }
};

export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const budgetId = req.params.id;

        await BudgetModel.delete(budgetId as string, userId);
        res.json({ message: 'Presupuesto eliminado' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
