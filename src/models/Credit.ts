import { prisma } from '../utils/prisma';
import { Credit as PrismaCredit, Installment as PrismaInstallment } from '@prisma/client';

export type Installment = Omit<PrismaInstallment, 'id' | 'creditId'> & { status: 'pending' | 'paid' };
export type Credit = PrismaCredit & { installments: Installment[] };

export const CreditModel = {
    findAllByUserId: async (userId: string): Promise<Credit[]> => {
        const credits = await prisma.credit.findMany({
            where: { userId },
            include: {
                installments: {
                    orderBy: { installmentNumber: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return credits as any;
    },

    create: async (userId: string, data: Omit<Credit, 'id' | 'userId' | 'createdAt' | 'installments'> & { installments: Installment[] }): Promise<Credit> => {
        const newCredit = await prisma.credit.create({
            data: {
                userId,
                name: data.name,
                amount: data.amount,
                interestRate: data.interestRate,
                rateType: data.rateType,
                term: data.term,
                termType: data.termType,
                installments: {
                    create: data.installments.map(i => ({
                        installmentNumber: i.installmentNumber,
                        initialBalance: i.initialBalance,
                        interest: i.interest,
                        amortization: i.amortization,
                        totalInstallment: i.totalInstallment,
                        finalBalance: i.finalBalance,
                        status: i.status
                    }))
                }
            },
            include: {
                installments: {
                    orderBy: { installmentNumber: 'asc' }
                }
            }
        });

        return newCredit as any;
    },

    payInstallment: async (creditId: string, userId: string, installmentNumber: number): Promise<Credit> => {
        const credit = await prisma.credit.findFirst({
            where: { id: creditId, userId }
        });

        if (!credit) throw new Error('Crédito no encontrado');

        const installment = await prisma.installment.findFirst({
            where: { creditId, installmentNumber }
        });

        if (!installment) throw new Error('Cuota no encontrada');
        if (installment.status === 'paid') throw new Error('La cuota ya está pagada');

        await prisma.installment.update({
            where: { id: installment.id },
            data: { status: 'paid' }
        });

        const updatedCredit = await prisma.credit.findUnique({
            where: { id: creditId },
            include: {
                installments: {
                    orderBy: { installmentNumber: 'asc' }
                }
            }
        });

        return updatedCredit as any;
    },

    delete: async (creditId: string, userId: string): Promise<void> => {
        const credit = await prisma.credit.findFirst({
            where: { id: creditId, userId }
        });

        if (!credit) throw new Error('Crédito no encontrado');

        await prisma.credit.delete({
            where: { id: creditId }
        });
    }
};
