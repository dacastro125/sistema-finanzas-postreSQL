import { prisma } from '../utils/prisma';
import { Category as PrismaCategory } from '@prisma/client';

export type Category = PrismaCategory;

const defaultCategories = [
    { name: 'Salario', type: 'income', color: '#4CAF50' },
    { name: 'Negocios', type: 'income', color: '#8BC34A' },
    { name: 'Alimentación', type: 'expense', color: '#FF9800' },
    { name: 'Transporte', type: 'expense', color: '#2196F3' },
    { name: 'Entretenimiento', type: 'expense', color: '#E91E63' },
    { name: 'Servicios', type: 'expense', color: '#9C27B0' },
    { name: 'Gasolina', type: 'expense', color: '#607D8B' }, // Azul grisáceo
    { name: '4x1000', type: 'expense', color: '#795548' },    // Café (impuestos compartidos)
    { name: 'Otros', type: 'expense', color: '#9E9E9E' }       // Gris neutro
];

export const CategoryModel = {
    createDefaultsForUser: async (userId: string): Promise<void> => {
        const categoriesData = defaultCategories.map(c => ({
            userId,
            ...c
        }));
        await prisma.category.createMany({ data: categoriesData });
    },

    findAllByUserId: async (userId: string): Promise<Category[]> => {
        return await prisma.category.findMany({ where: { userId } });
    },

    findByIdAndUserId: async (id: string, userId: string): Promise<Category | null> => {
        return await prisma.category.findFirst({ where: { id, userId } });
    },

    create: async (userId: string, data: Omit<Category, 'id' | 'userId' | 'createdAt'>): Promise<Category> => {
        return await prisma.category.create({
            data: {
                userId,
                name: data.name,
                type: data.type,
                color: data.color
            }
        });
    },

    delete: async (id: string, userId: string): Promise<void> => {
        const category = await prisma.category.findFirst({ where: { id, userId } });
        if (!category) throw new Error('Categoría no encontrada o no autorizada');

        await prisma.category.delete({ where: { id } });
    },

    update: async (id: string, userId: string, data: Partial<Omit<Category, 'id' | 'userId' | 'createdAt'>>): Promise<Category> => {
        const category = await prisma.category.findFirst({ where: { id, userId } });
        if (!category) throw new Error('Categoría no encontrada o no autorizada');

        return await prisma.category.update({
            where: { id },
            data
        });
    }
};
