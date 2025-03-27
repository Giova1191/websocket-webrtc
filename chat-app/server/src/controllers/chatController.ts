import { Request, Response } from 'express';
import { Message } from '../types';
import { getMessages, saveMessage } from '../models/MessageModel'; // Assicurati di avere un modello per i messaggi

export const getChatMessages = async (req: Request, res: Response) => {
    try {
        const messages: Message[] = await getMessages();
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero dei messaggi' });
    }
};

export const sendChatMessage = async (req: Request, res: Response) => {
    const { sender, content }: Message = req.body;

    if (!sender || !content) {
        return res.status(400).json({ error: 'Sender e content sono richiesti' });
    }

    try {
        const newMessage: Message = await saveMessage({ sender, content });
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: 'Errore nell\'invio del messaggio' });
    }
};