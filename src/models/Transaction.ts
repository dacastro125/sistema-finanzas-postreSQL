import { prisma } from '../utils/prisma';
import { Transaction as PrismaTransaction, Prisma } from '@prisma/client';

export type Transaction = PrismaTransaction;

export const TransactionModel = {
    findAllByUserId: async (userId: string): Promise<Transaction[]> => {
        return await prisma.transaction.findMany({
            where: { userId },
            orderBy: { date: 'desc' }
        });
    },

    findPaginatedByUserId: async (userId: string, skip: number, take: number): Promise<{ data: Transaction[], total: number }> => {
        const [data, total] = await prisma.$transaction([
            prisma.transaction.findMany({
                where: { userId },
                orderBy: [
                    { date: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip,
                take
            }),
            prisma.transaction.count({ where: { userId } })
        ]);
        return { data, total };
    },

    create: async (userId: string, data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): Promise<Transaction> => {
        return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const newTransaction = await tx.transaction.create({
                data: {
                    userId,
                    accountId: data.accountId,
                    categoryId: data.categoryId,
                    amount: data.amount,
                    type: data.type,
                    date: data.date,
                    note: data.note
                }
            });

            // Actualizar cuenta
            const account = await tx.account.findUnique({ where: { id: data.accountId } });
            if (!account) throw new Error('Cuenta no encontrada');

            if (data.type === 'income') {
                await tx.account.update({ where: { id: data.accountId }, data: { balance: account.balance + data.amount } });
            } else if (data.type === 'expense') {
                await tx.account.update({ where: { id: data.accountId }, data: { balance: account.balance - data.amount } });
            }

            return newTransaction;
        });
    },

    delete: async (id: string, userId: string): Promise<void> => {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const transaction = await tx.transaction.findFirst({ where: { id, userId } });
            if (!transaction) throw new Error('Transacción no encontrada');

            const account = await tx.account.findUnique({ where: { id: transaction.accountId } });
            if (account) {
                if (transaction.type === 'income') {
                    await tx.account.update({ where: { id: transaction.accountId }, data: { balance: account.balance - transaction.amount } });
                } else if (transaction.type === 'expense') {
                    await tx.account.update({ where: { id: transaction.accountId }, data: { balance: account.balance + transaction.amount } });
                }
            }

            await tx.transaction.delete({ where: { id } });
        });
    },

    update: async (id: string, userId: string, data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): Promise<Transaction> => {
        return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const oldTx = await tx.transaction.findFirst({ where: { id, userId } });
            if (!oldTx) throw new Error('Transacción no encontrada');

            const oldAccount = await tx.account.findUnique({ where: { id: oldTx.accountId } });
            if (oldAccount) {
                if (oldTx.type === 'income') {
                    await tx.account.update({ where: { id: oldTx.accountId }, data: { balance: oldAccount.balance - oldTx.amount } });
                } else if (oldTx.type === 'expense') {
                    await tx.account.update({ where: { id: oldTx.accountId }, data: { balance: oldAccount.balance + oldTx.amount } });
                }
            }

            const newAccount = await tx.account.findUnique({ where: { id: data.accountId } });
            if (newAccount) {
                if (data.type === 'income') {
                    await tx.account.update({ where: { id: data.accountId }, data: { balance: newAccount.balance + data.amount } });
                } else if (data.type === 'expense') {
                    await tx.account.update({ where: { id: data.accountId }, data: { balance: newAccount.balance - data.amount } });
                }
            }

            return await tx.transaction.update({
                where: { id },
                data: {
                    accountId: data.accountId,
                    categoryId: data.categoryId,
                    amount: data.amount,
                    type: data.type,
                    date: data.date,
                    note: data.note
                }
            });
        });
    }
};
