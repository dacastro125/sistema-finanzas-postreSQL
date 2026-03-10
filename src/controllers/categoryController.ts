import { Response } from 'express';
import { CategoryModel } from '../models/Category';
import { AuthRequest } from '../middleware/authMiddleware';

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const categories = await CategoryModel.findAllByUserId(userId);
        res.json(categories);
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al obtener categorías' });
    }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { name, type, color } = req.body;

        if (!name || !type || !color) {
            res.status(400).json({ error: 'Faltan campos requeridos (name, type, color)' });
            return;
        }

        const newCategory = await CategoryModel.create(userId, {
            name,
            type,
            color
        });

        res.status(201).json(newCategory);
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor al crear categoría' });
    }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const categoryId = req.params.id;

        await CategoryModel.delete(categoryId as string, userId);
        res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
