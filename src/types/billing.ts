// src/types/billing.ts

export interface Product {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    features: string[];
}

export interface Price {
    id: string;
    productId: string;
    active: boolean;
    unit_amount: number;
    currency: string;
    type: 'recurring' | 'one_time';
    interval: 'month' | 'year' | null;
}
