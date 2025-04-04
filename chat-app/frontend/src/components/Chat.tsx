
import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import VideoCall from './VideoCall';


type SocketClient = ReturnType<typeof io>;

import './Chat.css';

interface User {
  id: number;
  username: string;
  online: boolean;
}

interface Message {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  isRead: boolean;
  createdAt: string;
  sender?: {
    username: string;
  };
  _isLocalOnly?: boolean; 
}

interface UnreadMessages {
  [userId: number]: number;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessages>({});
  const [notificationSound] = useState<HTMLAudioElement | null>(
    typeof Audio !== 'undefined' ? new Audio('/notification.mp3') : null
  );

  const [showVideoCall, setShowVideoCall] = useState<boolean>(false);
  const [incomingCall, setIncomingCall] = useState<{ from: number; username: string } | null>(null);
  const [isCallInitiator, setIsCallInitiator] = useState<boolean>(false);
  const [callPeerUser, setCallPeerUser] = useState<User | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // References for currentUser, selectedUser, and users
  const currentUserRef = useRef<User | null>(null);
  const selectedUserRef = useRef<User | null>(null);
  const usersRef = useRef<User[]>([]);

  const playNotificationSound = useCallback(() => {
    if (notificationSound) {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(err => console.error("Errore nella riproduzione del suono:", err));
    }
  }, [notificationSound]);

  useEffect(() => {
    
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Inizializza socket
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Carica utente corrente
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/current-user', { 
          credentials: 'include' 
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch current user');
        }
        
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
          console.log('Current user:', data.user);
          
          // Informa il server che l'utente è online
          newSocket.emit('user_connected', data.user.id);
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
        setError('Errore nel caricamento del profilo utente');
      }
    };

    // Carica tutti gli utenti
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', { 
          credentials: 'include' 
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data);
        console.log('All users:', data);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Errore nel caricamento degli utenti');
      } finally {
        setLoading(false);
      }
    };

    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/messages', { 
          credentials: 'include' 
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        
        const data = await response.json();
        setMessages(data);
        console.log('Messages loaded:', data.length);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Errore nel caricamento dei messaggi');
      }
    };

    fetchCurrentUser();
    fetchUsers();
    fetchMessages();

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('connect_error', (err: Error) => {
      console.error('Socket connection error:', err);
      setError('Errore di connessione al server chat');
    });

    newSocket.on('users_online', (onlineUsers: number[]) => {
      console.log('Users online:', onlineUsers);
      setUsers(prev => 
        prev.map(user => ({
          ...user,
          online: onlineUsers.includes(user.id)
        }))
      );
    });

    newSocket.on('new_message', (message: Message) => {
      console.log('New message received:', message);
      
      
      setMessages(prev => {
        
        if (message.senderId === currentUserRef.current?.id) {
         
          const filteredMessages = prev.filter(msg => 
            !msg._isLocalOnly || 
            msg.content !== message.content || 
            msg.senderId !== message.senderId || 
            msg.receiverId !== message.receiverId 
          );
          
         
          return [...filteredMessages, message];
        }
        
        
        return [...prev, message];
      });
      
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      
      if (message.receiverId === currentUserRef.current?.id && message.senderId !== currentUserRef.current?.id) {
        if (!selectedUserRef.current || selectedUserRef.current.id !== message.senderId) {
          setUnreadMessages(prev => ({
            ...prev,
            [message.senderId]: (prev[message.senderId] || 0) + 1
          }));
          playNotificationSound();
          if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            const senderName = usersRef.current.find(u => u.id === message.senderId)?.username || 'Utente';
            new Notification(`Nuovo messaggio da ${senderName}`, {
              body: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
              icon: '/chat-icon.png'
            });
          }
        }
      }
    });

    newSocket.on('user_connected', (userId: number) => {
      console.log('User connected:', userId);
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, online: true } : user
        )
      );
    });

    newSocket.on('user_disconnected', (userId: number) => {
      console.log('User disconnected:', userId);
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, online: false } : user
        )
      );
    });

    newSocket.on('video_call_request', (data: { from: number; username: string }) => {
      console.log('Incoming video call from:', data.username);
      
      // Mostra notifica di chiamata in arrivo
      setIncomingCall(data);
      
      // Riproduci suono della chiamata
      playNotificationSound();
      
      
      if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        new Notification(`Chiamata in arrivo da ${data.username}`, {
          body: 'Clicca per rispondere alla chiamata video',
          icon: '/video-call-icon.png'
        });
      }
    });

    newSocket.on('video_call_accepted', (data: { from: number }) => {
      const current = selectedUserRef.current;
      if (current && data.from === current.id) {
        // Avvia la chiamata
        setCallPeerUser(current);
        setIsCallInitiator(true);
        setShowVideoCall(true);
      }
    });

    newSocket.on('video_call_rejected', (data: { from: number }) => {
      const current = selectedUserRef.current;
      if (current && data.from === current.id) {
        alert(`${current.username} ha rifiutato la chiamata`);
      }
    });

    // Cleanup
    return () => {
      console.log('Disconnecting from socket server');
      newSocket.off('video_call_request');
      newSocket.off('video_call_accepted');
      newSocket.off('video_call_rejected');
      newSocket.disconnect();
    };
  }, [playNotificationSound]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !socket || !selectedUser || !currentUser) {
      return;
    }

    console.log('Sending message to:', selectedUser.username);
    
    // Invia al server
    socket.emit('send_message', {
      content: inputMessage,
      receiverId: selectedUser.id,
      senderId: currentUser.id
    });

    
    const newMessage: Message = {
      id: Date.now(), // ID temporaneo
      content: inputMessage,
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      createdAt: new Date().toISOString(),
      isRead: false,
      sender: {
        username: currentUser.username
      },
      _isLocalOnly: true 
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    scrollToBottom();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !socket || !currentUser || !selectedUser) return;
    
    const file = files[0];
    setIsUploading(true);
    
  
    const formData = new FormData();
    formData.append('file', file);
    formData.append('senderId', currentUser.id.toString());
    formData.append('receiverId', selectedUser.id.toString());
    
    
    fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      console.log('File uploaded:', data);
      
      
      socket.emit('send_message', {
        content: `FILE:${data.fileType}:${data.fileName}:${data.fileUrl}`,
        receiverId: selectedUser.id,
        senderId: currentUser.id,
        fileType: data.fileType
      });
      
     
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    })
    .catch(err => {
      console.error('Error uploading file:', err);
      alert('Errore durante il caricamento del file. Riprova.');
    })
    .finally(() => {
      setIsUploading(false);
    });
  };

  const renderMessage = (message: Message) => {
    
    if (message.content.startsWith('FILE:')) {
      const [, fileType, fileName, fileUrl] = message.content.split(':');
      
      
      if (fileType.startsWith('image')) {
        return (
          <div className="file-message image-message">
            <img src={fileUrl} alt={fileName} />
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
              {fileName}
            </a>
          </div>
        );
      } else if (fileType.startsWith('video')) {
        return (
          <div className="file-message video-message">
            <video controls>
              <source src={fileUrl} type={fileType} />
              Il tuo browser non supporta il tag video.
            </video>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
              {fileName}
            </a>
          </div>
        );
      } else if (fileType.startsWith('audio')) {
        return (
          <div className="file-message audio-message">
            <audio controls>
              <source src={fileUrl} type={fileType} />
              Il tuo browser non supporta il tag audio.
            </audio>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
              {fileName}
            </a>
          </div>
        );
      } else if (fileType === 'application/pdf') {
        return (
          <div className="file-message pdf-message">
            <div className="pdf-icon">📄</div>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
              {fileName}
            </a>
          </div>
        );
      } else {
        
        return (
          <div className="file-message generic-file">
            <div className="file-icon">📎</div>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
              {fileName}
            </a>
          </div>
        );
      }
    }
    
    
    return message.content;
  };

  const selectUser = (user: User) => {
    setSelectedUser(user);
    console.log('Selected user:', user.username);
    
    
    setUnreadMessages(prev => ({
      ...prev,
      [user.id]: 0
    }));
    
    
    if (socket && currentUser) {
      socket.emit('chat_open', {
        userId: currentUser.id,
        withUserId: user.id
      });
      
      
      socket.emit('mark_messages_read', {
        senderId: user.id,
        receiverId: currentUser.id
      });
    }
  };

  const startVideoCall = () => {
    if (!selectedUser || !currentUser || !socket) return;
    
    
    socket.emit('video_call_request', {
      to: selectedUser.id,
      from: currentUser.id,
      username: currentUser.username
    });
    
   
    alert(`Chiamata a ${selectedUser.username} in corso...`);
  };

  const acceptVideoCall = () => {
    if (!incomingCall || !currentUser || !socket) return;
    
    // Accetta la chiamata
    socket.emit('video_call_accepted', {
      to: incomingCall.from,
      from: currentUser.id
    });
    
    
    const caller = users.find(u => u.id === incomingCall.from);
    if (caller) {
      setCallPeerUser(caller);
      setIsCallInitiator(false);
      setShowVideoCall(true);
    }
    
   
    setIncomingCall(null);
  };

  const rejectVideoCall = () => {
    if (!incomingCall || !currentUser || !socket) return;
    
   
    socket.emit('video_call_rejected', {
      to: incomingCall.from,
      from: currentUser.id
    });
    
   
    setIncomingCall(null);
  };

  const endVideoCall = () => {
    setShowVideoCall(false);
  };

  if (loading) {
    return <div className="loading-state">Caricamento della chat...</div>;
  }

  return (
    <div className="chat-container">
      {error && <div className="error-banner">{error}</div>}
      
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Chat App</h2>
          {currentUser && (
            <div className="current-user">
              <span className="status-dot online"></span>
              <span>Benvenuto, <strong>{currentUser.username}</strong></span>
            </div>
          )}
        </div>
        
        <div className="user-list">
          <h3>Utenti {users.filter(u => u.id !== currentUser?.id).length > 0 ? `(${users.filter(u => u.id !== currentUser?.id).length})` : ''}</h3>
          
          {users.filter(u => u.id !== currentUser?.id).length === 0 ? (
            <p className="no-users">Nessun altro utente disponibile</p>
          ) : (
            users
              .filter(user => user.id !== currentUser?.id)
              .map(user => (
                <div
                  key={user.id}
                  className={`user-item ${selectedUser?.id === user.id ? 'active' : ''}`}
                  onClick={() => selectUser(user)}
                >
                  <div className="user-info">
                    <span className={`status-dot ${user.online ? 'online' : 'offline'}`}></span>
                    <span className="username">{user.username}</span>
                  </div>
                  <div className="user-status-container">
                    {unreadMessages[user.id] > 0 && (
                      <span className="unread-badge">{unreadMessages[user.id]}</span>
                    )}
                    <span className="user-status-text">
                      {user.online ? 'online' : 'offline'}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>

        <div className="sidebar-footer">
          <button 
            className="logout-button" 
            onClick={async () => {
              try {
                
                if (socket) {
                  socket.disconnect();
                }
                
                
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  credentials: 'include'
                });
                
                
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                
                
                window.location.href = '/login';
              } catch (error) {
                console.error('Logout failed:', error);
                alert('Errore durante il logout. Prova a ricaricare la pagina.');
              }
            }}
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="chat-area">
        {!selectedUser ? (
          <div className="no-chat-selected">
            <div className="welcome-message">
              <h2>Benvenuto nella Chat</h2>
              <p>Seleziona un utente dalla lista per iniziare a chattare</p>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-with-user">
                <span className={`status-dot ${selectedUser.online ? 'online' : 'offline'}`}></span>
                <h3>{selectedUser.username}</h3>
                <span className="user-status">
                  {selectedUser.online ? 'online' : 'offline'}
                </span>
              </div>
              {selectedUser.online && (
                <button 
                  className="video-call-button"
                  onClick={startVideoCall}
                  title="Avvia videochiamata"
                >
                  📹
                </button>
              )}
            </div>
            
            <div className="messages-container">
              {messages.filter(
                msg => 
                  (msg.senderId === currentUser?.id && msg.receiverId === selectedUser.id) || 
                  (msg.senderId === selectedUser.id && msg.receiverId === currentUser?.id)
              ).length === 0 ? (
                <div className="no-messages">
                  <p>Nessun messaggio ancora. Inizia la conversazione!</p>
                </div>
              ) : (
                messages
                  .filter(
                    msg => 
                      (msg.senderId === currentUser?.id && msg.receiverId === selectedUser.id) || 
                      (msg.senderId === selectedUser.id && msg.receiverId === currentUser?.id)
                  )
                  .map(message => (
                    <div 
                      key={message.id}
                      className={`message ${message.senderId === currentUser?.id ? 'sent' : 'received'}`}
                    >
                      <div className="message-content">
                        {renderMessage(message)}
                        <span className="message-time">
                          {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form className="message-form" onSubmit={sendMessage}>
              <input 
                type="file" 
                ref={fileInputRef}
                className="file-input"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button 
                type="button" 
                className="attach-file-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Allega file"
              >
                📎
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Scrivi un messaggio..."
                autoFocus
                disabled={isUploading}
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isUploading}
                className={!inputMessage.trim() || isUploading ? 'disabled' : ''}
              >
                Invia
              </button>
            </form>
          </>
        )}
      </div>

      {incomingCall && (
        <div className="incoming-call">
          <div className="incoming-call-content">
            <div className="incoming-call-header">
              <h4>Chiamata in arrivo</h4>
              <p>Da {incomingCall.username}</p>
            </div>
            <div className="incoming-call-actions">
              <button 
                className="accept-call"
                onClick={acceptVideoCall}
              >
                Accetta
              </button>
              <button 
                className="reject-call"
                onClick={rejectVideoCall}
              >
                Rifiuta
              </button>
            </div>
          </div>
        </div>
      )}

      {showVideoCall && callPeerUser && currentUser && socket && (
        <VideoCall 
          socket={socket}
          currentUser={{id: currentUser.id, username: currentUser.username}}
          peerUser={{id: callPeerUser.id, username: callPeerUser.username}}
          onClose={endVideoCall}
          isInitiator={isCallInitiator}
        />
      )}
    </div>
  );
};

export default Chat;