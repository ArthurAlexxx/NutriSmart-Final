'use server';

import { db } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { subDays, format } from 'date-fns';

const DEMO_USER_ID = 'z9Ru4QiC4Kf5Okf257OruaazvyF2';

const foodLibrary = [
    { name: 'Ovos mexidos', calorias: 150, proteinas: 12, carboidratos: 1, gorduras: 11, porcao: '2 un' },
    { name: 'Pão integral', calorias: 80, proteinas: 4, carboidratos: 15, gorduras: 1, porcao: '1 fatia' },
    { name: 'Banana', calorias: 105, proteinas: 1, carboidratos: 27, gorduras: 0, porcao: '1 un' },
    { name: 'Peito de frango grelhado', calorias: 165, proteinas: 31, carboidratos: 0, gorduras: 4, porcao: '100g' },
    { name: 'Arroz branco', calorias: 130, proteinas: 3, carboidratos: 28, gorduras: 0, porcao: '100g' },
    { name: 'Brócolis cozido', calorias: 55, proteinas: 4, carboidratos: 11, gorduras: 1, porcao: '1 xícara' },
    { name: 'Salmão assado', calorias: 206, proteinas: 22, carboidratos: 0, gorduras: 12, porcao: '100g' },
    { name: 'Batata doce', calorias: 86, proteinas: 2, carboidratos: 20, gorduras: 0, porcao: '100g' },
    { name: 'Iogurte grego', calorias: 100, proteinas: 17, carboidratos: 6, gorduras: 0, porcao: '1 pote' },
    { name: 'Mix de castanhas', calorias: 170, proteinas: 5, carboidratos: 6, gorduras: 15, porcao: '30g' },
    { name: 'Whey Protein', calorias: 120, proteinas: 24, carboidratos: 3, gorduras: 1, porcao: '1 scoop' },
    { name: 'Feijão preto', calorias: 132, proteinas: 9, carboidratos: 24, gorduras: 1, porcao: '1 concha' },
];

const mealTypes = ['cafe-da-manha', 'almoco', 'lanche', 'jantar'];

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomMeal(mealType: string) {
    const mealFoods = [];
    let totals = { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 };
    const numFoods = getRandomInt(2, 3);
    
    const availableFoods = [...foodLibrary];

    for (let i = 0; i < numFoods; i++) {
        if (availableFoods.length === 0) break;
        const randomIndex = getRandomInt(0, availableFoods.length - 1);
        const food = availableFoods.splice(randomIndex, 1)[0];
        
        const portionMultiplier = 0.8 + Math.random() * 0.4; // +/- 20%
        const finalCalories = Math.round(food.calorias * portionMultiplier);
        
        mealFoods.push({
            name: food.name,
            portion: food.porcao,
            unit: '', // Simplificado para o seed
        });
        totals.calorias += finalCalories;
        totals.proteinas += Math.round(food.proteinas * portionMultiplier);
        totals.carboidratos += Math.round(food.carboidratos * portionMultiplier);
        totals.gorduras += Math.round(food.gorduras * portionMultiplier);
    }

    return {
        mealType: mealType,
        mealData: {
            alimentos: mealFoods,
            totais: totals,
        },
    };
}


export async function seedDemoData() {
    const batch = db.batch();
    const today = new Date();

    for (let i = 0; i < 30; i++) {
        const day = subDays(today, i);
        const dateStr = format(day, 'yyyy-MM-dd');

        // Seed Meals
        const numMeals = getRandomInt(3, 4);
        for (let j = 0; j < numMeals; j++) {
            const mealType = mealTypes[j];
            const meal = generateRandomMeal(mealType);
            const mealRef = db.collection('users').doc(DEMO_USER_ID).collection('meal_entries').doc();
            batch.set(mealRef, {
                userId: DEMO_USER_ID,
                date: dateStr,
                createdAt: Timestamp.fromDate(day),
                ...meal
            });
        }

        // Seed Hydration
        const hydrationRef = db.collection('users').doc(DEMO_USER_ID).collection('hydration_entries').doc(`${DEMO_USER_ID}_${dateStr}`);
        batch.set(hydrationRef, {
            userId: DEMO_USER_ID,
            date: dateStr,
            intake: getRandomInt(1500, 3500),
            goal: 2500,
        });

        // Seed Weight
        const weightLogRef = db.collection('users').doc(DEMO_USER_ID).collection('weight_logs').doc();
        batch.set(weightLogRef, {
            userId: DEMO_USER_ID,
            date: dateStr,
            weight: 75 - (i * 0.1) + (Math.random() - 0.5), // Simulate gradual weight loss
            createdAt: Timestamp.fromDate(day),
        });
    }

    try {
        await batch.commit();
        return { success: true, message: 'Dados de demonstração gerados para 30 dias!' };
    } catch (error: any) {
        console.error("Error seeding data: ", error);
        return { success: false, message: error.message };
    }
}

export async function deleteSeededData() {
    const collectionsToDelete = ['meal_entries', 'hydration_entries', 'weight_logs'];
    try {
        for (const collectionName of collectionsToDelete) {
            const snapshot = await db.collection('users').doc(DEMO_USER_ID).collection(collectionName).get();
            if (snapshot.empty) continue;

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
        return { success: true, message: 'Todos os dados de demonstração foram removidos.' };
    } catch (error: any) {
        console.error("Error deleting seeded data: ", error);
        return { success: false, message: error.message };
    }
}
