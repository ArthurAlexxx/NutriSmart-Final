// src/types/finance.ts
import type { Timestamp } from 'firebase/firestore';

export interface FinancialTransaction {
    id: string;
    userId: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: Timestamp;
    createdAt: Timestamp;
}
