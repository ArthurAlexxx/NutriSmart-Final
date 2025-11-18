// src/components/chat-input.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (input: string) => void;
  isResponding: boolean;
}

export default function ChatInput({ onSendMessage, isResponding }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isResponding) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto p-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Diga o que você quer cozinhar..."
                className="flex-1 rounded-full h-12 px-5"
                disabled={isResponding}
            />
            <Button type="submit" size="icon" className="h-12 w-12 rounded-full" disabled={isResponding || !input.trim()}>
                <Send className="h-5 w-5" />
                <span className="sr-only">Enviar</span>
            </Button>
            </form>
        </div>
    </div>
  );
}
