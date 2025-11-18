// src/lib/achievements.ts
import { Rocket, ChefHat, Dumbbell, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    trigger: 'register' | 'add-meal' | 'use-chef';
}

export const achievements: Achievement[] = [
    {
        id: 'first-steps',
        name: 'Primeiros Passos',
        description: 'Você se registrou e iniciou sua jornada saudável.',
        icon: Star,
        trigger: 'register',
    },
    {
        id: 'first-meal',
        name: 'Diário Inaugurado',
        description: 'Você registrou sua primeira refeição. O começo de um novo hábito!',
        icon: Rocket,
        trigger: 'add-meal',
    },
    {
        id: 'chef-apprentice',
        name: 'Aprendiz de Chef',
        description: 'Você usou o Chef Virtual pela primeira vez para pedir uma receita.',
        icon: ChefHat,
        trigger: 'use-chef',
    },
];
