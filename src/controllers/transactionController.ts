import { Response } from 'express';
import { TransactionModel } from '../models/Transaction';
import { AccountModel } from '../models/Account';
import { AuthRequest } from '../middleware/authMiddleware';

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const transactions = await TransactionModel.findAllByUserId(userId);
        res.json(transactions);
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al obtener transacciones' });
    }
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { accountId, categoryId, amount, type, date, note, targetAccountId } = req.body;

        if (!accountId || !categoryId || amount === undefined || !type || !date) {
            res.status(400).json({ error: 'Faltan campos requeridos (accountId, categoryId, amount, type, date)' });
            return;
        }

        if (type !== 'income' && type !== 'expense' && type !== 'transfer') {
            res.status(400).json({ error: 'Tipo inválido. Debe ser: income, expense o transfer' });
            return;
        }

        const account = await AccountModel.findFirstSafe(accountId, userId);
        if (!account) {
            res.status(404).json({ error: 'Cuenta origen no encontrada' });
            return;
        }

        if (type === 'transfer') {
            if (!targetAccountId) {
                res.status(400).json({ error: 'Para transferencias se requiere targetAccountId' });
                return;
            }
            const targetAccount = await AccountModel.findFirstSafe(targetAccountId, userId);
            if (!targetAccount) {
                res.status(404).json({ error: 'Cuenta destino no encontrada' });
                return;
            }

            // Crear transacción de egreso en cuenta 1
            const transferOut = await TransactionModel.create(userId, {
                accountId,
                categoryId,
                amount: Number(amount),
                type: 'expense',
                date,
                note: `Transferencia a ${targetAccount.name}` + (note ? ` - ${note}` : '')
            });

            // Crear transacción de ingreso en cuenta 2
            await TransactionModel.create(userId, {
                accountId: targetAccountId,
                categoryId,
                amount: Number(amount),
                type: 'income',
                date,
                note: `Transferencia desde ${account.name}` + (note ? ` - ${note}` : '')
            });

            res.status(201).json(transferOut);
            return;
        }

        // Si es ingreso o gasto normal
        const newTransaction = await TransactionModel.create(userId, {
            accountId,
            categoryId,
            amount: Number(amount),
            type: type as any,
            date,
            note
        });

        res.status(201).json(newTransaction);
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al crear transacción' });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const transactionId = req.params.id;

        await TransactionModel.delete(transactionId as string, userId);
        res.json({ message: 'Transacción eliminada exitosamente' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const transactionId = req.params.id;
        const { accountId, categoryId, amount, type, date, note } = req.body;

        if (!accountId || !categoryId || amount === undefined || !type || !date) {
            res.status(400).json({ error: 'Faltan campos requeridos para modificar la transacción' });
            return;
        }

        const updatedTransaction = await TransactionModel.update(transactionId as string, userId, {
            accountId,
            categoryId,
            amount: Number(amount),
            type: type as any,
            date,
            note
        });

        res.json(updatedTransaction);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
