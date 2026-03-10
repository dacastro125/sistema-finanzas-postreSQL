import { prisma } from '../utils/prisma';
import { Budget as PrismaBudget } from '@prisma/client';

export type Budget = PrismaBudget;

export const BudgetModel = {
    findAllByUserId: async (userId: string): Promise<Budget[]> => {
        return await prisma.budget.findMany({ where: { userId } });
    },

    findByCategoryId: async (categoryId: string, userId: string): Promise<Budget | null> => {
        return await prisma.budget.findFirst({ where: { categoryId, userId } });
    },

    upsert: async (userId: string, categoryId: string, limitAmount: number): Promise<Budget> => {
        const existing = await prisma.budget.findFirst({ where: { categoryId, userId } });

        if (existing) {
            return await prisma.budget.update({
                where: { id: existing.id },
                data: { limitAmount }
            });
        } else {
            return await prisma.budget.create({
                data: { userId, categoryId, limitAmount }
            });
        }
    },

    delete: async (id: string, userId: string): Promise<void> => {
        const existing = await prisma.budget.findFirst({ where: { id, userId } });
        if (!existing) throw new Error('Presupuesto no encontrado');

        await prisma.budget.delete({ where: { id } });
    }
};
