import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import session from 'express-session';
import { db } from './db'; // Importa il db dal file separato

// In cima al file server.ts, dopo gli import
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// Estendi l'interfaccia Socket per includere userId
interface CustomSocket extends Socket {
  userId?: number;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configurazione middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 ore
  }
}));

// Gestione degli eventi socket
io.on('connection', (socket: CustomSocket) => {
  console.log('New client connected');
  
  // Quando un utente si connette
  socket.on('user_connected', (userId) => {
    // Associa l'ID socket all'ID utente
    socket.userId = userId;
    
    // Notifica tutti i client degli utenti online
    const onlineUsers = Array.from(io.sockets.sockets.values())
      .filter((s: CustomSocket) => s.userId)
      .map((s: CustomSocket) => s.userId);
    
    io.emit('users_online', onlineUsers);
  });
  
  // Quando un utente invia un messaggio
  socket.on('send_message', async (messageData) => {
    try {
      // Salva il messaggio nel database
      const newMessage = await db.createMessage(messageData);
      
      // Emetti il messaggio a tutti i client
      io.emit('new_message', newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });
  
  // Quando un utente apre una chat
  socket.on('chat_open', (data) => {
    console.log(`User ${data.userId} opened chat with ${data.withUserId}`);
  });
  
  // Gestione delle videochiamate
  socket.on('video_call_request', (data) => {
    // Inoltra la richiesta al destinatario
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_call_request', {
          from: data.from,
          username: data.username
        });
      }
    });
  });

  socket.on('video_call_accepted', (data) => {
    // Notifica l'iniziatore che la chiamata è stata accettata
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_call_accepted', {
          from: data.from
        });
      }
    });
  });

  socket.on('video_call_rejected', (data) => {
    // Notifica l'iniziatore che la chiamata è stata rifiutata
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_call_rejected', {
          from: data.from
        });
      }
    });
  });

  socket.on('video_offer', (data) => {
    // Inoltra l'offerta al destinatario
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_offer', {
          offer: data.offer,
          from: data.from
        });
      }
    });
  });

  socket.on('video_answer', (data) => {
    // Inoltra la risposta all'iniziatore
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_answer', {
          answer: data.answer,
          from: data.from
        });
      }
    });
  });

  socket.on('video_ice_candidate', (data) => {
    // Inoltra il candidato ICE
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_ice_candidate', {
          candidate: data.candidate,
          from: data.from
        });
      }
    });
  });

  socket.on('video_call_ended', (data) => {
    // Notifica la fine della chiamata
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_call_ended', {
          from: data.from
        });
      }
    });
  });

  socket.on('mark_messages_read', (data) => {
    // Segna i messaggi come letti nel database
    db.markAsRead(data.senderId, data.receiverId)
      .catch(err => console.error('Errore nel segnare i messaggi come letti:', err));
  });

  // Quando un socket si disconnette
  socket.on('disconnect', () => {
    if (socket.userId) {
      // Notifica tutti che l'utente è offline
      io.emit('user_disconnected', socket.userId);
      
      // Aggiorna la lista degli utenti online
      const onlineUsers = Array.from(io.sockets.sockets.values())
        .filter((s: CustomSocket) => s.userId)
        .map((s: CustomSocket) => s.userId);
      
      io.emit('users_online', onlineUsers);
    }
    console.log('Client disconnected');
  });
});

// Rotte per gli utenti
app.get('/api/users', async (_req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Rotte per i messaggi
app.get('/api/messages', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const messages = await db.getMessages(userId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint per il login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username e password richiesti' });
    }

    // Cerca l'utente nel database
    const user = await db.getUser(username);
    
    if (!user) {
      // Se l'utente non esiste, crealo (solo per test, rimuovi in produzione)
      const userId = await db.createUser(username, password);
      const newUser = await db.getUserById(userId);
      
      // Salva l'ID dell'utente nella sessione
      if (req.session) {
        req.session.userId = userId;
      }
      
      return res.status(201).json({ 
        message: 'Utente creato e autenticato', 
        user: { id: newUser?.id, username: newUser?.username } 
      });
    }
    
    // In un'app reale, confronteresti la password con hash
    // qui lo facciamo in modo molto semplice per semplicità
    if (user.password !== password) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }
    
    // Salva l'ID dell'utente nella sessione
    if (req.session) {
      req.session.userId = user.id;
    }
    
    // Restituisci i dati dell'utente senza la password
    return res.json({ 
      message: 'Login effettuato con successo', 
      user: { id: user.id, username: user.username } 
    });
    
  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// Endpoint per la registrazione
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username e password richiesti' });
    }
    
    // Verifica se l'utente esiste già
    const existingUser = await db.getUser(username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username già in uso' });
    }
    
    // Crea un nuovo utente
    const userId = await db.createUser(username, password);
    const user = await db.getUserById(userId);
    
    // Salva l'ID dell'utente nella sessione
    if (req.session) {
      req.session.userId = userId;
    }
    
    return res.status(201).json({ 
      message: 'Utente registrato con successo', 
      user: { id: user?.id, username: user?.username } 
    });
    
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// Endpoint per recuperare l'utente corrente
app.get('/api/auth/current-user', (req, res) => {
  try {
    // Se non c'è un userId nella sessione, l'utente non è autenticato
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ authenticated: false });
    }
    
    // Recupera i dati dell'utente
    db.getUserById(req.session.userId)
      .then(user => {
        if (!user) {
          return res.status(404).json({ message: 'Utente non trovato' });
        }
        
        // Restituisci i dati dell'utente senza la password
        res.json({ 
          authenticated: true, 
          user: { id: user.id, username: user.username } 
        });
      })
      .catch(error => {
        console.error('Errore nel recupero dell\'utente:', error);
        res.status(500).json({ message: 'Errore del server' });
      });
    
  } catch (error) {
    console.error('Errore nel controllo dell\'autenticazione:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// Endpoint per il logout
app.post('/api/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Errore durante il logout' });
      }
      res.clearCookie('connect.sid'); // O qualunque sia il nome del tuo cookie di sessione
      return res.json({ message: 'Logout effettuato con successo' });
    });
  } else {
    res.json({ message: 'Nessuna sessione attiva' });
  }
});

// Avvia il server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});