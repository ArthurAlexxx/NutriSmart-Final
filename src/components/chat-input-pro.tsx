// src/components/chat-input-pro.tsx
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, CornerDownLeft } from 'lucide-react';

interface ChatInputProProps {
  onSendMessage: (input: string) => void;
  isLoading: boolean;
}

export function ChatInputPro({ onSendMessage, isLoading }: ChatInputProProps) {
  const [input, setInput] = useState('');

  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 bg-background border-t">
      <div className="relative">
        <Textarea
          placeholder="Digite sua mensagem aqui..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
          className="min-h-[48px] rounded-2xl resize-none p-4 pr-16"
        />
        <Button 
          type="submit" 
          size="icon" 
          className="absolute top-3 right-3 w-8 h-8"
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Enviar</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 ml-1">
        Pressione <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">Shift</span>+<CornerDownLeft className="h-3 w-3" />
        </kbd> para quebrar a linha.
      </p>
    </div>
  );
}
