import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { CategoryModel } from '../models/Category';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_for_development';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Por favor, envíe todos los campos (name, email, password).' });
            return;
        }

        const newUser = await UserModel.create({ name, email, password });

        // Crear las categorías por defecto en DB para este usuario
        await CategoryModel.createDefaultsForUser(newUser.id);

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: { id: newUser.id, name: newUser.name, email: newUser.email }
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Por favor, ingrese email y contraseña.' });
            return;
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(401).json({ error: 'Credenciales inválidas.' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: 'Credenciales inválidas.' });
            return;
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    message: 'Inicio de sesión exitoso',
                    token,
                    user: { id: user.id, name: user.name, email: user.email }
                });
            }
        );
    } catch (error: any) {
        res.status(500).json({ error: 'Error del servidor' });
    }
};
