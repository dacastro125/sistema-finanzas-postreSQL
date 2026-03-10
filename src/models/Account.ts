import { prisma } from '../utils/prisma';
import { Account as PrismaAccount } from '@prisma/client';

export type Account = PrismaAccount;

export const AccountModel = {
    findAllByUserId: async (userId: string): Promise<Account[]> => {
        return await prisma.account.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    },

    findByIdAndUserId: async (id: string, userId: string): Promise<Account | null> => {
        return await prisma.account.findFirst({
            where: { id, userId }
        });
    },

    // A better approach since Prisma doesn't always allow composite unique by default unless defined.
    // Let's use findFirst
    findFirstSafe: async (id: string, userId: string): Promise<Account | null> => {
        return await prisma.account.findFirst({
            where: { id, userId }
        });
    },

    create: async (userId: string, data: Omit<Account, 'id' | 'userId' | 'createdAt' | 'balance'> & { balance?: number }): Promise<Account> => {
        return await prisma.account.create({
            data: {
                userId,
                name: data.name,
                type: data.type,
                balance: data.balance || 0
            }
        });
    },

    updateBalance: async (id: string, amountChange: number): Promise<Account> => {
        // Obtenemos balance actual y sumamos el cambio
        const account = await prisma.account.findUnique({ where: { id } });
        if (!account) throw new Error('Cuenta no encontrada');

        return await prisma.account.update({
            where: { id },
            data: { balance: account.balance + amountChange }
        });
    },

    remove: async (id: string, userId: string): Promise<void> => {
        const account = await prisma.account.findFirst({ where: { id, userId } });
        if (!account) throw new Error('Cuenta no encontrada o no pertenece al usuario');

        await prisma.account.delete({ where: { id } });
    },

    updateFields: async (id: string, userId: string, data: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>): Promise<Account> => {
        const account = await prisma.account.findFirst({ where: { id, userId } });
        if (!account) throw new Error('Cuenta no encontrada');

        return await prisma.account.update({
            where: { id },
            data
        });
    }
};
