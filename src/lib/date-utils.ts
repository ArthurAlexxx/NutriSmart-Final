
// src/lib/date-utils.ts

/**
 * Retorna a data no formato YYYY-MM-DD para um fuso horário específico,
 * evitando problemas de conversão de um dia para o outro.
 * @param date - A data a ser formatada (padrão: agora).
 * @returns A data como string no formato 'YYYY-MM-DD'.
 */
export const getLocalDateString = (date = new Date()): string => {
    return new Intl.DateTimeFormat('sv-SE').format(date);
}

/**
 * Retorna a hora de um objeto de data ou timestamp do Firebase
 * no formato HH:MM.
 * @param dateOrTimestamp - O objeto de data ou timestamp.
 * @returns A hora formatada como string 'HH:MM' ou 'N/A'.
 */
export const getMealTime = (entry: { createdAt: any }): string => {
    if (entry.createdAt && typeof entry.createdAt.toDate === 'function') {
        // É um timestamp do Firebase
        return entry.createdAt.toDate().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
    }
    // Fallback para outros tipos de data (menos provável, mas seguro)
    if (entry.createdAt instanceof Date) {
        return entry.createdAt.toLocaleTimeString('pt-BR', {
            hour: '2-digit', 
            minute: '2-digit'
        });
    }
    return 'N/A';
};
