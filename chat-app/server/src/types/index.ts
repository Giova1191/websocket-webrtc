// Questo file contiene le interfacce utilizzate nel server

export interface User {
    id: string;
    username: string;
    password: string;
    createdAt: Date;
}

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: Date;
}