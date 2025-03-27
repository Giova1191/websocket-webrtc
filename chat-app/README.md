# README.md

# Chat App

Questo progetto è un'applicazione di chat in tempo reale che utilizza WebRTC per videochiamate e Socket.io per la messaggistica. È costruita con Node.js, TypeScript, Express per il backend e React con Vite per il frontend.

## Struttura del Progetto

```
chat-app
├── client
│   ├── src
│   │   ├── components
│   │   │   ├── Chat.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── VideoCall.tsx
│   │   ├── types
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server
│   ├── src
│   │   ├── controllers
│   │   │   ├── authController.ts
│   │   │   └── chatController.ts
│   │   ├── models
│   │   │   └── User.ts
│   │   ├── routes
│   │   │   ├── authRoutes.ts
│   │   │   └── chatRoutes.ts
│   │   ├── types
│   │   │   └── index.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Installazione

1. Clona il repository:
   ```bash
   git clone <URL_DEL_REPOSITORY>
   cd chat-app
   ```

2. Installa le dipendenze per il client:
   ```bash
   cd client
   npm install
   ```

3. Installa le dipendenze per il server:
   ```bash
   cd ../server
   npm install
   ```

## Esecuzione

1. Avvia il server:
   ```bash
   cd server
   npm run start
   ```

2. Avvia il client:
   ```bash
   cd client
   npm run dev
   ```

## Funzionalità

- Registrazione e login degli utenti
- Chat in tempo reale
- Videochiamate tramite WebRTC

## Contribuire

Se desideri contribuire a questo progetto, sentiti libero di aprire una pull request o segnalare problemi.