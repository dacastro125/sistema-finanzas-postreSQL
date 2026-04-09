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

    payInstallment: async (creditId: string, userId: string, installmentNumber: number, payAmount?: number): Promise<Credit> => {
        const credit = await prisma.credit.findFirst({
            where: { id: creditId, userId }
        });

        if (!credit) throw new Error('Crédito no encontrado');

        const installment = await prisma.installment.findFirst({
            where: { creditId, installmentNumber }
        });

        if (!installment) throw new Error('Cuota no encontrada');
        if (installment.status === 'paid') throw new Error('La cuota ya está pagada');

        const oldAmountPaid = installment.amountPaid || 0;
        const currentPayAmount = payAmount || (installment.totalInstallment - oldAmountPaid);
        const newAmountPaid = oldAmountPaid + currentPayAmount;
        
        if (newAmountPaid < installment.totalInstallment) {
            // Pago parcial: se actualiza el monto pagado pero sigue pendiente
            await prisma.installment.update({
                where: { id: installment.id },
                data: { amountPaid: newAmountPaid, status: 'pending' }
            });
        } else {
            // Pago completo o abono a capital (exceso)
            const excess = newAmountPaid - installment.totalInstallment;
            const newFinalBalance = Math.max(0, installment.finalBalance - excess);

            await prisma.installment.update({
                where: { id: installment.id },
                data: { 
                    status: 'paid',
                    amountPaid: newAmountPaid,
                    finalBalance: newFinalBalance,
                    // Si pagó de más, sumamos ese exceso a la amortización de esta cuota
                    amortization: installment.amortization + excess
                }
            });

            if (excess > 0) {
                // Re-amortización de las cuotas pendientes
                const pendingFuture = await prisma.installment.findMany({
                    where: { creditId, installmentNumber: { gt: installmentNumber } },
                    orderBy: { installmentNumber: 'asc' }
                });

                if (pendingFuture.length > 0) {
                    if (newFinalBalance <= 0) {
                        // Deuda saldada, borrar cuotas futuras
                        await prisma.installment.deleteMany({
                            where: { creditId, installmentNumber: { gt: installmentNumber } }
                        });
                    } else {
                        // Recalcular cuotas
                        let rateMonthly = (credit.rateType === 'anual') ? (credit.interestRate / 100 / 12) : (credit.interestRate / 100);
                        let remainingTerm = pendingFuture.length;
                        
                        let newCuota = 0;
                        if (rateMonthly === 0) {
                            newCuota = newFinalBalance / remainingTerm;
                        } else {
                            newCuota = newFinalBalance * (rateMonthly * Math.pow(1 + rateMonthly, remainingTerm)) / (Math.pow(1 + rateMonthly, remainingTerm) - 1);
                        }

                        let saldo = newFinalBalance;

                        // Se utiliza una serie de updates secuenciales
                        for (let i = 0; i < pendingFuture.length; i++) {
                            const futInst = pendingFuture[i];
                            const interes = saldo * rateMonthly;
                            let amortizacion = newCuota - interes;

                            if (i === pendingFuture.length - 1) {
                                amortizacion = saldo; // Ajuste por redondeo al final
                                newCuota = interes + amortizacion;
                            }

                            const saldoInicial = saldo;
                            saldo -= amortizacion;
                            if (saldo < 0.01) saldo = 0;

                            await prisma.installment.update({
                                where: { id: futInst.id },
                                data: {
                                    initialBalance: saldoInicial,
                                    interest: interes,
                                    amortization: amortizacion,
                                    totalInstallment: newCuota,
                                    finalBalance: saldo
                                }
                            });
                        }
                    }
                }
            }
        }

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
