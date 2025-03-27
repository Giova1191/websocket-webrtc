import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes';
import multer from 'multer';
import path from 'path';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use('/api/auth', authRoutes);
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    }
});
  
const upload = multer({ storage });
  
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Nessun file caricato' });
    }
    res.json({ 
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}` 
    });
});

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Mappa per tenere traccia degli utenti online
const onlineUsers = new Map<string, number>();

io.on('connection', (socket) => {
    console.log('Nuova connessione socket:', socket.id);

    socket.on('user connected', async (userId: number) => {
        console.log('Utente connesso:', userId);
        onlineUsers.set(socket.id, userId);
        
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true
            }
        });

        const onlineUsersList = users.map(user => ({
            ...user,
            online: Array.from(onlineUsers.values()).includes(user.id)
        }));

        io.emit('users online', onlineUsersList);
    });

    socket.on('send message', async (data: { content: string; receiverId: number }) => {
        const senderId = onlineUsers.get(socket.id);
        if (!senderId) return;

        try {
            const message = await prisma.message.create({
                data: {
                    content: data.content,
                    senderId,
                    receiverId: data.receiverId,
                },
                include: {
                    sender: true
                }
            });

            // Invia il messaggio al destinatario
            const recipientSocketId = Array.from(onlineUsers.entries())
                .find(([_, id]) => id === data.receiverId)?.[0];

            if (recipientSocketId) {
                io.to(recipientSocketId).emit('new message', message);
            }

            // Invia il messaggio anche al mittente
            socket.emit('new message', message);
        } catch (error) {
            console.error('Errore nell\'invio del messaggio:', error);
        }
    });

    socket.on('file shared', async (data: { filename: string, receiverId: number }) => {
        const senderId = onlineUsers.get(socket.id);
        if (!senderId) return;
      
        try {
          const message = await prisma.message.create({
            data: {
              content: `FILE:${data.filename}`,
              senderId,
              receiverId: data.receiverId,
            },
            include: { sender: true }
          });
      
          const recipientSocketId = Array.from(onlineUsers.entries())
            .find(([_, id]) => id === data.receiverId)?.[0];
      
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('new message', message);
          }
          socket.emit('new message', message);
        } catch (error) {
          console.error('Errore nella condivisione del file:', error);
        }
    });
    
    socket.on('call user', (data) => {
        console.log('Chiamata da', data.from, 'a', data.userToCall);
        const recipientSocketId = Array.from(onlineUsers.entries())
            .find(([_, id]) => id === data.userToCall)?.[0];

        if (recipientSocketId) {
            io.to(recipientSocketId).emit('incoming call', {
                signal: data.signalData,
                from: data.from
            });
        }
    });

    socket.on('answer call', (data) => {
        console.log('Risposta alla chiamata verso', data.to);
        const callerSocketId = Array.from(onlineUsers.entries())
            .find(([_, id]) => id === data.to)?.[0];

        if (callerSocketId) {
            io.to(callerSocketId).emit('call accepted', data.signal);
        }
    });

    socket.on('disconnect', async () => {
        const userId = onlineUsers.get(socket.id);
        if (userId) {
            console.log('Utente disconnesso:', userId);
            onlineUsers.delete(socket.id);

            // Invia la lista aggiornata degli utenti online a tutti
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    username: true
                }
            });

            const onlineUsersList = users.map(user => ({
                ...user,
                online: Array.from(onlineUsers.values()).includes(user.id)
            }));

            io.emit('users online', onlineUsersList);
        }
    });
});

// Correggi la funzione senza usare il parametro 'req' non utilizzato
app.get('/api/users', async (_, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Errore nel recupero degli utenti:', error);
        res.status(500).json({ message: 'Errore nel recupero degli utenti' });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});