# Chat App con WebSocket e WebRTC

Un'applicazione di chat in tempo reale con funzionalità di messaggistica e videochiamate, costruita con React, Node.js, Socket.IO e WebRTC.


## 🎥 Video Tutorial
Guarda il tutorial direttamente da GitHub:  
[Scarica/Apri il video](https://github.com/Giova1191/websocket-webrtc/blob/main/chat-app/demos/videotutorial.mp4)

## 📸 Screenshots

Visualizza tutti gli screenshot nella cartella dedicata:  
[screenshots/](https://github.com/Giova1191/websocket-webrtc/tree/main/chat-app/screenshots)

*(Clicca per vedere tutte le immagini)*

## 🚀 Funzionalità

- **Autenticazione Utente**
  - Registrazione e login
  - Gestione della sessione utente

- **Chat in Tempo Reale**
  - Messaggistica istantanea tra utenti
  - Indicatore di stato online/offline
  - Notifiche di nuovi messaggi
  - Cronologia delle conversazioni

- **Videochiamate**
  - Chiamate video one-to-one con WebRTC
  - Controlli audio (muto/attivo)
  - Controlli video (attiva/disattiva camera)
  - Condivisione schermo
  - Layout adattivo per la videochiamata

- **Condivisione File**
  - Supporto per l'invio di file di vari formati
  - Anteprima di immagini, video e documenti
  - Download diretto dei file condivisi

- **UI/UX**
  - Interfaccia moderna e responsive
  
  

## 🛠️ Tecnologie Utilizzate

### Frontend
- **React** - Vite
- **TypeScript** - Tipizzazione statica
- **Socket.IO Client** - Comunicazione in tempo reale
- **WebRTC** - Videochiamate P2P
- **CSS Modules/SCSS** - Stile

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Socket.IO** - Server WebSocket
- **Mysql** - Database
- **Express-sesion** - Autenticazione
- **Multer** - Gestione upload file

## 📋 Prerequisiti

- Node.js (v14.x o superiore)
- npm o yarn
- Un browser moderno che supporti WebRTC (Chrome, Firefox, Safari, Edge)

## ⚙️ Installazione e Setup

1. **Clona il repository**
   ```bash
   git clone https://github.com/Giova1191/websocket-webrtc
   cd chat-app
   ```

2. **Installa le dipendenze del backend**
   ```bash
   cd backend
   npm install
   ```

3. **Installa le dipendenze del frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configura le variabili d'ambiente**
   - Crea un file `.env` nella cartella backend
   ```
   PORT=5000
   JWT_SECRET=your_jwt_secret
   DATABASE_URL=your_database_url
   ```

5. **Avvia il server backend**
   ```bash
   cd ../backend
   npm start
   ```

6. **Avvia il client frontend**
   ```bash
   cd ../frontend
   npm start
   ```

7. **Apri l'applicazione**
   - Naviga su `http://localhost:5173` nel tuo browser

## 🎮 Come Usare l'Applicazione

1. **Registrazione e Login**
   - Crea un nuovo account o accedi con credenziali esistenti
   - L'applicazione ti reindirizzerà alla dashboard della chat

2. **Messaggistica**
   - Seleziona un utente dalla lista contatti
   - Scrivi il tuo messaggio e premi invio
   - Puoi inviare testo e file

3. **Videochiamate**
   - Seleziona un utente online
   - Clicca sull'icona della videocamera per iniziare una chiamata
   - Usa i controlli per gestire audio, video e condivisione schermo
   - Clicca "Termina chiamata" per chiudere

4. **Condivisione File**
   - Clicca sull'icona di allegato nella chat
   - Seleziona il file da condividere
   - Il file verrà caricato e condiviso nella conversazione

5. **Logout**
   - Clicca sul pulsante di logout nella sidebar per uscire

## 🔒 Sicurezza


- Le password vengono hashate prima di essere archiviate
- Le connessioni WebSocket sono autenticate
- I file caricati vengono validati per tipo e dimensione

## 🧩 Architettura

L'applicazione è strutturata secondo un'architettura client-server:

- **Client (Frontend)**
  - Componenti React per UI
  - Socket.IO client per messaggistica in tempo reale
  - API WebRTC per videochiamate peer-to-peer

- **Server (Backend)**
  - API RESTful per autenticazione e operazioni CRUD
  - Server Socket.IO per gestire eventi in tempo reale
  - Middleware di autenticazione
  - Gestione dello storage per upload file

## 👨‍💻 Sviluppo Futuro

Funzionalità pianificate per future versioni:

- Chat di gruppo
- Crittografia end-to-end dei messaggi
- Notifiche push
- Ricerca messaggi e contatti
- Chiamate audio senza video


## 📞 Contatti

Per domande o feedback, contattare:

- Nome: Giovanni Diluca
- Email: giovanni.diluca@hotmail.it
- GitHub: https://github.com/Giova1191

---

