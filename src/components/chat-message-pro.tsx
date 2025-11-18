// src/components/chat-message-pro.tsx
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon, Stethoscope } from 'lucide-react';
import type { Message } from '@/types/chat';

interface ChatMessageProProps {
  message: Message;
  isCurrentUser: boolean;
}

export function ChatMessagePro({ message, isCurrentUser }: ChatMessageProProps) {
  const getInitials = (name: string = '') => name.split(' ').map(n => n[0]).slice(0, 2).join('');
  
  const senderIsProfessional = message.isProfessional;

  const AvatarComponent = () => (
    <Avatar className="h-8 w-8 border">
      <AvatarFallback className={cn(senderIsProfessional ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "bg-secondary")}>
        {senderIsProfessional ? <Stethoscope className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <div className={cn('flex items-end gap-3', isCurrentUser && 'justify-end')}>
      {!isCurrentUser && <AvatarComponent />}
      <div className={cn(
            'flex flex-col gap-1 max-w-[75%]',
            isCurrentUser ? 'items-end' : 'items-start'
        )}>
        <p className="text-xs text-muted-foreground px-1">{message.senderName}</p>
        <div className={cn(
             'rounded-2xl p-3 text-sm break-words shadow-sm',
             isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background rounded-bl-none'
         )}>
           <p>{message.text}</p>
        </div>
      </div>
      {isCurrentUser && <AvatarComponent />}
    </div>
  );
}
