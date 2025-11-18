// src/types/chat.ts
import type { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Timestamp;
  isProfessional: boolean;
}
