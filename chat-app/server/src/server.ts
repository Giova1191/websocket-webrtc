import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import session from 'express-session';
import { db } from './db'; 
import multer from 'multer';
import path from 'path';
import fs from 'fs';


declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}


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


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Limite di 50MB
});


app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
 
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.status(200).json({
      message: 'File uploaded successfully',
      fileName: req.file.originalname,
      fileUrl: fileUrl,
      fileType: req.file.mimetype
    });
  } catch (err) {
    console.error('Error in file upload:', err);
    res.status(500).json({ error: 'Server error during upload' });
  }
});


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


io.on('connection', (socket: CustomSocket) => {
  console.log('New client connected');
  
 
  socket.on('user_connected', (userId) => {
    
    socket.userId = userId;
    
    
    const onlineUsers = Array.from(io.sockets.sockets.values())
      .filter((s: CustomSocket) => s.userId)
      .map((s: CustomSocket) => s.userId);
    
    io.emit('users_online', onlineUsers);
  });
  
 
  socket.on('send_message', async (messageData) => {
    try {
    
      const newMessage = await db.createMessage(messageData);
      
      
      io.emit('new_message', newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });
  
  
  socket.on('chat_open', (data) => {
    console.log(`User ${data.userId} opened chat with ${data.withUserId}`);
  });
  
  
  socket.on('video_call_request', (data) => {
    
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
  
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_call_accepted', {
          from: data.from
        });
      }
    });
  });

  socket.on('video_call_rejected', (data) => {
    
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_call_rejected', {
          from: data.from
        });
      }
    });
  });

  socket.on('video_offer', (data) => {
    
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
    
    io.sockets.sockets.forEach((s: CustomSocket) => {
      if (s.userId === data.to) {
        s.emit('video_call_ended', {
          from: data.from
        });
      }
    });
  });

  socket.on('mark_messages_read', (data) => {
    
    db.markAsRead(data.senderId, data.receiverId)
      .catch(err => console.error('Errore nel segnare i messaggi come letti:', err));
  });

  
  socket.on('disconnect', () => {
    if (socket.userId) {
      
      io.emit('user_disconnected', socket.userId);
      
      
      const onlineUsers = Array.from(io.sockets.sockets.values())
        .filter((s: CustomSocket) => s.userId)
        .map((s: CustomSocket) => s.userId);
      
      io.emit('users_online', onlineUsers);
    }
    console.log('Client disconnected');
  });
});


app.get('/api/users', async (_req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


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


app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username e password richiesti' });
    }

    
    const user = await db.getUser(username);
    
    if (!user) {
     
      const userId = await db.createUser(username, password);
      const newUser = await db.getUserById(userId);
      
      
      if (req.session) {
        req.session.userId = userId;
      }
      
      return res.status(201).json({ 
        message: 'Utente creato e autenticato', 
        user: { id: newUser?.id, username: newUser?.username } 
      });
    }
    
    
    if (user.password !== password) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }
    
   
    if (req.session) {
      req.session.userId = user.id;
    }
    
   
    return res.json({ 
      message: 'Login effettuato con successo', 
      user: { id: user.id, username: user.username } 
    });
    
  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});


app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username e password richiesti' });
    }
    
    
    const existingUser = await db.getUser(username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username già in uso' });
    }
    
    
    const userId = await db.createUser(username, password);
    const user = await db.getUserById(userId);
    
    
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


app.get('/api/auth/current-user', (req, res) => {
  try {
  
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ authenticated: false });
    }
    
    
    db.getUserById(req.session.userId)
      .then(user => {
        if (!user) {
          return res.status(404).json({ message: 'Utente non trovato' });
        }
        
        
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


app.post('/api/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Errore durante il logout' });
      }
      res.clearCookie('connect.sid'); 
      return res.json({ message: 'Logout effettuato con successo' });
    });
  } else {
    res.json({ message: 'Nessuna sessione attiva' });
  }
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});