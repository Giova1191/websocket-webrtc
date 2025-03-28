// server/src/db.ts
import fs from 'fs';
import path from 'path';

// Directory per i dati persistenti
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Assicurati che la directory esista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Inizializza i file se non esistono
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]));
}

interface User {
  id: number;
  username: string;
  password: string;
}

interface Message {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  isRead: boolean;
  createdAt: string;
}

// Database di esempio
export const db = {
  // Utenti
  getUser: async (username: string): Promise<User | null> => {
    const users: User[] = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    return users.find(u => u.username === username) || null;
  },

  getUserById: async (id: number): Promise<User | null> => {
    const users: User[] = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    return users.find(u => u.id === id) || null;
  },

  createUser: async (username: string, password: string): Promise<number> => {
    const users: User[] = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
    
    users.push({ id, username, password });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    
    return id;
  },

  getAllUsers: async (): Promise<{ id: number, username: string, online: boolean }[]> => {
    const users: User[] = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    return users.map(({ id, username }) => ({ id, username, online: false }));
  },

  // Messaggi
  createMessage: async (data: { content: string, senderId: number, receiverId: number }): Promise<Message> => {
    const messages: Message[] = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    
    const newMessage: Message = {
      id: messages.length ? Math.max(...messages.map(m => m.id)) + 1 : 1,
      content: data.content,
      senderId: data.senderId,
      receiverId: data.receiverId,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    
    messages.push(newMessage);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages));
    
    return newMessage;
  },

  getMessages: async (userId: number): Promise<Message[]> => {
    const messages: Message[] = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    return messages.filter(m => m.senderId === userId || m.receiverId === userId);
  },

  markAsRead: async (senderId: number, receiverId: number): Promise<void> => {
    const messages: Message[] = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    
    const updatedMessages = messages.map(m => {
      if (m.senderId === senderId && m.receiverId === receiverId && !m.isRead) {
        return { ...m, isRead: true };
      }
      return m;
    });
    
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(updatedMessages));
  }
};