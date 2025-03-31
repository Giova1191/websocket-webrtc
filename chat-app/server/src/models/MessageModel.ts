
export interface Message {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  createdAt: string;
  isRead: boolean;
  
  sender: {
    id: number;
    username: string;
  };
}