
// src/components/chat-view.tsx
'use client';

import { useEffect, useRef } from 'react';
import ChatMessage, { type Message } from './chat-message';
import ChatInput from './chat-input';
import { Loader2, ChefHat } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface ChatViewProps {
  messages: Message[];
  isResponding: boolean;
  onSendMessage: (input: string) => void;
}

export default function ChatView({ messages, isResponding, onSendMessage }: ChatViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, isResponding]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1" viewportRef={viewportRef}>
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
           <div className="py-6 sm:py-8 text-center relative shrink-0">
                <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-full p-2 sm:p-3 mb-2 sm:mb-4">
                    <ChefHat className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground font-heading">Converse com seu Chef IA</h1>
                <p className="text-muted-foreground max-w-2xl mt-2 sm:mt-3 mx-auto">Peça receitas, dicas de culinária ou faça alterações nos pratos. Sua imaginação é o limite.</p>
            </div>

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isResponding && (
            <div className="flex items-center gap-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">O Chef está pensando...</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t">
        <ChatInput onSendMessage={onSendMessage} isResponding={isResponding} />
      </div>
    </div>
  );
}
