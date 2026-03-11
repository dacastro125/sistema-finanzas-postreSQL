import { Response } from 'express';
import { AccountModel } from '../models/Account';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../utils/prisma';

export const getAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const accounts = await AccountModel.findAllByUserId(userId);
        res.json(accounts);
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al obtener cuentas' });
    }
};

export const createAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { name, type, balance } = req.body;

        if (!name || !type || balance === undefined) {
            res.status(400).json({ error: 'Faltan campos requeridos (name, type, balance)' });
            return;
        }

        const newAccount = await AccountModel.create(userId, {
            name,
            type,
            balance: Number(balance)
        });

        res.status(201).json(newAccount);
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al crear cuenta' });
    }
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const accountId = req.params.id;

        // Verificar si existen transacciones ligadas a esta cuenta usando Prisma directly para evitar volcar la BD en RAM
        const transactionExists = await prisma.transaction.findFirst({
            where: { userId, accountId: accountId as string }
        });

        if (transactionExists) {
            res.status(400).json({ error: 'No se puede eliminar la cuenta porque tiene transacciones asociadas. Elimina las transacciones primero.' });
            return;
        }

        await AccountModel.remove(accountId as string, userId);
        res.json({ message: 'Cuenta eliminada exitosamente' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const updateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const accountId = req.params.id;
        const { name, type, balance } = req.body;

        const newData = {
            name,
            type,
            balance: balance !== undefined ? Number(balance) : undefined
        };

        // Eliminar valores undefined
        Object.keys(newData).forEach(key => (newData as any)[key] === undefined && delete (newData as any)[key]);

        const updatedAccount = await AccountModel.updateFields(accountId as string, userId, newData as any);
        res.json(updatedAccount);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
