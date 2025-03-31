import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import 'express-session';

declare module 'express-session' {
    interface SessionData {
        userId: number;
    }
}

const prisma = new PrismaClient();


export const register = async (req: Request, res: Response) => {
    const { username, password, email } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username già in uso' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                email
            }
        });

        res.status(201).json({ 
            message: 'Utente registrato con successo',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Errore durante la registrazione' });
    }
};


export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password errata' });
        }

        req.session.userId = user.id; 
        res.status(200).json({ 
            message: 'Login effettuato con successo',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Errore durante il login' });
    }
};


export const logout = (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
        if (err) {
            return res.status(500).json({ message: 'Errore durante il logout' });
        }
        res.status(200).json({ message: 'Logout effettuato con successo' });
    });
};


export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Non autenticato' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.session.userId }
        });

        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei dati utente' });
    }
};