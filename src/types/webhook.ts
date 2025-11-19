// src/types/webhook.ts
import type { Timestamp } from 'firebase/firestore';

export interface WebhookLog {
    id: string;
    payload: any;
    status: 'SUCCESS' | 'FAILURE';
    details: string;
    createdAt: Timestamp;
}
