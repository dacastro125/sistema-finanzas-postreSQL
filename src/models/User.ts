import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { User as PrismaUser } from '@prisma/client';

export type User = PrismaUser;

export const UserModel = {
    findAll: async (): Promise<User[]> => {
        return await prisma.user.findMany();
    },

    findById: async (id: string): Promise<User | null> => {
        return await prisma.user.findUnique({ where: { id } });
    },

    findByEmail: async (email: string): Promise<User | null> => {
        return await prisma.user.findUnique({ where: { email } });
    },

    create: async (data: Omit<User, 'id' | 'passwordHash' | 'createdAt'> & { password?: string }): Promise<User> => {
        const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
        if (existingUser) {
            throw new Error('El correo electrónico ya está registrado.');
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(data.password || '', salt);

        return await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                passwordHash: hash
            }
        });
    }
};
