import { Response } from 'express';
import { BudgetModel } from '../models/Budget';
import { CategoryModel } from '../models/Category';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../utils/prisma';

export const getBudgetsWithProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        const now = new Date();
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const yearStr = String(now.getFullYear());
        const datePrefix = `${yearStr}-${monthStr}-`;

        // Consultas optimizadas en paralelo. Agrupamos los gastos directo en Postgres.
        const [budgets, allCategories, expensesByCategory] = await Promise.all([
            BudgetModel.findAllByUserId(userId),
            CategoryModel.findAllByUserId(userId),
            prisma.transaction.groupBy({
                by: ['categoryId'],
                _sum: { amount: true },
                where: { 
                    userId, 
                    type: 'expense', 
                    date: { startsWith: datePrefix }, 
                    categoryId: { not: null } 
                }
            })
        ]);

        const categories = allCategories.filter(c => c.type === 'expense');

        // Mapa rápido para gastos O(1)
        const spentMap = expensesByCategory.reduce((map, expense) => {
            if (expense.categoryId) map[expense.categoryId] = expense._sum.amount || 0;
            return map;
        }, {} as Record<string, number>);

        // Construir la respuesta con el progreso
        const results = categories.map(cat => {
            const budget = budgets.find(b => b.categoryId === cat.id);
            const limitAmount = budget ? budget.limitAmount : 0;
            const spentAmount = spentMap[cat.id] || 0;
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
