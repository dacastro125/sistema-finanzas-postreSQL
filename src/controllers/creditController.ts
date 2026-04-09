import { Response } from 'express';
import { CreditModel } from '../models/Credit';
import { AuthRequest } from '../middleware/authMiddleware';

export const getCredits = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const credits = await CreditModel.findAllByUserId(userId);
        res.json(credits);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createCredit = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { name, amount, interestRate, rateType, term, termType, installments } = req.body;

        if (!name || amount === undefined || interestRate === undefined || term === undefined || !installments) {
            res.status(400).json({ error: 'Faltan campos obligatorios o la tabla de amortización.' });
            return;
        }

        const newCredit = await CreditModel.create(userId, {
            name,
            amount: Number(amount),
            interestRate: Number(interestRate),
            rateType,
            term: Number(term),
            termType,
            installments
        });

        res.status(201).json(newCredit);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const payCreditInstallment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const creditId = req.params.id as string;
        const { installmentNumber, payAmount } = req.body;

        if (installmentNumber === undefined) {
            res.status(400).json({ error: 'Debes proporcionar el installmentNumber' });
            return;
        }

        const updatedCredit = await CreditModel.payInstallment(creditId, userId, Number(installmentNumber), payAmount ? Number(payAmount) : undefined);
        res.json(updatedCredit);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteCredit = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const creditId = req.params.id as string;

        await CreditModel.delete(creditId, userId);
        res.json({ message: 'Crédito eliminado exitosamente' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
