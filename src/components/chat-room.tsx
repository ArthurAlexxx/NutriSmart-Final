// src/components/chat-room.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Message } from '@/types/chat';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ChatInputPro } from './chat-input-pro';
import { ChatMessagePro } from './chat-message-pro';
import { useToast } from '@/hooks/use-toast';

interface ChatRoomProps {
  roomId: string;
  currentUser: {
    uid: string;
    name: string;
  };
  isProfessional: boolean;
}

export function ChatRoom({ roomId, currentUser, isProfessional }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();
  const { toast } = useToast();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!roomId || !firestore) return;

    const messagesRef = collection(firestore, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        loadedMessages.push({ id: doc.id, ...doc.data() } as Message);
      });

      // Notification logic
      if (!isInitialLoad.current && loadedMessages.length > messages.length) {
        const newMessage = loadedMessages[loadedMessages.length - 1];
        if (newMessage.senderId !== currentUser.uid) {
          toast({
            title: `Nova mensagem de ${newMessage.senderName}`,
            description: newMessage.text,
          });
        }
      }

      setMessages(loadedMessages);
      setLoading(false);
       if (isInitialLoad.current) {
        isInitialLoad.current = false;
        // Mark messages as read on initial load
        const roomRef = doc(firestore, 'rooms', roomId);
        updateDoc(roomRef, {
          [`lastRead.${currentUser.uid}`]: Timestamp.now()
        });
      }
    }, (error) => {
      setLoading(false);
      console.error("Error fetching chat messages: ", error);
      toast({
          title: "Erro ao carregar chat",
          description: "Não foi possível carregar as mensagens. Verifique sua conexão e permissões.",
          variant: "destructive"
      });
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, firestore, currentUser.uid]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !currentUser || sending || !firestore) return;

    setSending(true);

    const messageData = {
      text,
      senderId: currentUser.uid,
      senderName: currentUser.name,
      createdAt: serverTimestamp(),
      isProfessional,
    };
    
    const messagesRef = collection(firestore, 'rooms', roomId, 'messages');
    const roomRef = doc(firestore, 'rooms', roomId);

    try {
      await addDoc(messagesRef, messageData);
      // Update the last message on the room for unread indicators
      await updateDoc(roomRef, {
        lastMessage: {
          text: text,
          senderId: currentUser.uid,
          createdAt: Timestamp.now(), // Use client-side timestamp for immediate feedback
        }
      });
    } catch (error: any) {
        console.error("Failed to send message: ", error);
        toast({
            title: "Erro ao enviar mensagem",
            description: error.message || "Não foi possível enviar a mensagem.",
            variant: "destructive"
        })
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex-1 flex flex-col bg-muted/30 rounded-lg border">
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-muted-foreground">Nenhuma mensagem ainda.<br/>Envie a primeira mensagem para iniciar a conversa.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessagePro
              key={msg.id}
              message={msg}
              isCurrentUser={msg.senderId === currentUser.uid}
            />
          ))
        )}
      </div>
      <ChatInputPro onSendMessage={handleSendMessage} isLoading={sending} />
    </div>
  );
}
