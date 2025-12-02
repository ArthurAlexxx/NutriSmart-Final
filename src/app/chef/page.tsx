
'use client';

import { useState, useEffect, useCallback }from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, serverTimestamp, writeBatch, getDocs, Unsubscribe, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/app-layout';
import { ChefHat, Trash2 } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import ChatView from '@/components/chat-view';
import { Message, initialMessages as defaultInitialMessages } from '@/components/chat-message';
import { Recipe } from '@/lib/ai-schemas';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { generateRecipeAction } from '@/app/actions/ai-actions';
import SubscriptionOverlay from '@/components/subscription-overlay';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export default function ChefPage() {
  const { user, userProfile, onProfileUpdate, effectiveSubscriptionStatus } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [isResponding, setIsResponding] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  
  const isFeatureLocked = effectiveSubscriptionStatus === 'free';

  useEffect(() => {
    if (!user || !firestore) {
      return;
    }

    let unsubMessages: Unsubscribe | undefined;

    const messagesRef = collection(firestore, 'users', user.uid, 'chef_messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    unsubMessages = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            setMessages(defaultInitialMessages);
        } else {
            const loadedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(loadedMessages);
        }
    }, (error) => {
        console.error("Error fetching chef messages:", error);
        toast({
          title: 'Erro ao carregar o chat',
          description: 'Não foi possível buscar as mensagens. Verifique sua conexão.',
          variant: 'destructive',
        });
        setMessages(defaultInitialMessages); 
    });
    

    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [user, firestore, toast]);

  const handleProfileUpdateWithToast = useCallback(async (updatedProfile: Partial<UserProfile>) => {
     try {
        await onProfileUpdate(updatedProfile);
        toast({ title: 'Perfil Atualizado!', description: 'Suas informações foram salvas.' });
     } catch(e) {
        console.error(e);
        toast({ title: "Erro ao atualizar", description: "Não foi possível salvar suas informações.", variant: "destructive"});
     }
  }, [onProfileUpdate, toast]);

  const saveMessage = (message: Omit<Message, 'id' | 'createdAt'>) => {
      if (!user || !firestore) return;
      const messagesRef = collection(firestore, 'users', user.uid, 'chef_messages');
      const messageData = {
          ...message,
          createdAt: serverTimestamp(),
      };
      
      addDoc(messagesRef, messageData).catch(error => {
        console.error('Failed to save message:', error);
        toast({
            title: 'Erro de Conexão',
            description: 'Não foi possível salvar sua mensagem. Tente novamente.',
            variant: 'destructive'
        });
        const contextualError = new FirestorePermissionError({
            operation: 'create',
            path: `users/${user.uid}/chef_messages`,
            requestResourceData: messageData,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  };
  
  const unlockAchievement = async (achievementId: string) => {
    if (!userProfile || !firestore || (userProfile.unlockedAchievements || []).includes(achievementId)) {
        return;
    }
    
    try {
        await onProfileUpdate({
            unlockedAchievements: arrayUnion(achievementId)
        });
        toast({
            title: "Nova Conquista Desbloqueada!",
            description: `Você ganhou a conquista "Aprendiz de Chef".`,
        });
    } catch(e) {
        console.error("Failed to unlock achievement:", e);
    }
  };


  const handleSendMessage = async (input: string) => {
      if (!input.trim() || !user || isFeatureLocked) return;
      
      setIsResponding(true);

      const userMessage: Omit<Message, 'id' | 'createdAt'> = {
          role: 'user' as const,
          content: input,
      };
      saveMessage(userMessage);

      try {
        const recipeResult: Recipe = await generateRecipeAction(input);
        
        const assistantMessage: Omit<Message, 'id' | 'createdAt'> = {
            role: 'assistant' as const,
            content: "Aqui está uma receita que preparei para você:",
            recipe: recipeResult,
        };
        saveMessage(assistantMessage);
        
        // Unlock achievement
        await unlockAchievement('chef-apprentice');

      } catch (error: any) {
          console.error("Failed to get AI response:", error);
          
          let errorMessageContent = "Desculpe, não consegui entender seu pedido. Funciono melhor quando você me diz os ingredientes que tem em casa. Por exemplo: 'tenho frango, brócolis e arroz'.\n\nPoderia tentar de novo com os ingredientes?";

          if (error.message.includes("não parece ser um alimento")) {
              errorMessageContent = `Desculpe, mas "${input}" não parece ser um alimento. Por favor, insira ingredientes de comida para que eu possa criar uma receita.`;
          } else if (error.message.includes("formato de receita")) {
              errorMessageContent = `Tive um problema para criar a receita. Tente ser mais específico sobre os ingredientes que você tem.`;
          }


          const errorMessage: Omit<Message, 'id' | 'createdAt'> = {
            role: 'assistant' as const,
            content: errorMessageContent,
          };
          saveMessage(errorMessage);
          
          toast({
              title: "Ops! Algo deu errado.",
              description: error.message || "Tente me dizer os ingredientes que você tem disponíveis.",
              variant: "destructive"
          });
      } finally {
          setIsResponding(false);
      }
  };

  const handleClearChat = async () => {
    if (!user || !firestore) {
        toast({ title: "Erro", description: "Usuário não autenticado." });
        return;
    }
    const messagesRef = collection(firestore, 'users', user.uid, 'chef_messages');
    try {
        const snapshot = await getDocs(messagesRef);
        if (snapshot.empty) {
          setMessages(defaultInitialMessages);
          toast({
            title: "Histórico Limpo",
            description: "A conversa com o Chef foi reiniciada."
          });
          return;
        }

        const batch = writeBatch(firestore);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit()
        toast({ title: "Histórico Limpo", description: "A conversa com o Chef foi reiniciada." });

    } catch (error) {
        console.error("Error clearing chat history:", error);
        toast({ title: "Erro ao Limpar", description: "Não foi possível limpar o histórico do chat.", variant: "destructive" });
        const contextualError = new FirestorePermissionError({
            operation: 'delete',
            path: `users/${user.uid}/chef_messages`,
        });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
      <div className="relative h-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
        {isFeatureLocked && <SubscriptionOverlay />}
         <Card className={cn("flex-1 flex flex-col w-full max-w-4xl mx-auto rounded-2xl shadow-lg overflow-hidden border", isFeatureLocked && 'blur-md pointer-events-none')}>
            <ChatView
                messages={messages}
                isResponding={isResponding}
                onSendMessage={handleSendMessage}
            />
        </Card>

         <Button
            variant="outline"
            size="icon"
            onClick={handleClearChat}
            className="absolute top-12 right-12 h-9 w-9"
            aria-label="Limpar histórico do chat"
        >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </AppLayout>
  );
}
