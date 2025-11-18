
'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChefHat, User } from 'lucide-react';
import RecipeDisplay from './recipe-display';
import type { Timestamp } from 'firebase/firestore';
import type { Recipe } from '@/lib/ai-schemas';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recipe?: Recipe | null;
  createdAt?: Timestamp | { seconds: number; nanoseconds: number; }; // Allow both server and client side timestamp
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn('flex items-start gap-3 sm:gap-4 py-4', isAssistant ? '' : 'justify-end')}>
      <Avatar className={cn('h-8 w-8 sm:h-10 sm:w-10 border', isAssistant ? 'bg-primary/10 text-primary' : 'bg-secondary', !isAssistant && 'order-2')}>
        <AvatarFallback>
          {isAssistant ? <ChefHat className="h-5 w-5 sm:h-6 sm:w-6" /> : <User className="h-5 w-5 sm:h-6 sm:w-6" />}
        </AvatarFallback>
      </Avatar>
      <div className={cn(
        'max-w-[85%] sm:max-w-xl lg:max-w-3xl rounded-2xl p-3 sm:p-4',
        isAssistant ? 'bg-secondary rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'
      )}>
        {message.content && <p className="text-base whitespace-pre-wrap">{message.content}</p>}
        {message.recipe && (
          <div className={cn(message.content && 'mt-4')}>
            <RecipeDisplay recipe={message.recipe} isGenerating={false} isChatMode={true} />
          </div>
        )}
      </div>
    </div>
  );
}


export const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Olá! Sou seu Chef Virtual. O que você gostaria de preparar hoje? Diga-me quais ingredientes você tem ou que tipo de prato está com vontade de comer.",
  },
];
