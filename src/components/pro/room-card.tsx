// src/components/pro/room-card.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Room } from '@/types/room';
import { User, Calendar, Droplet, Flame, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo } from 'react';
import Link from 'next/link';

interface RoomCardProps {
  room: Room;
  professionalId: string;
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
  <div className="flex items-start gap-2 text-sm">
    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
    <div>
      <p className="font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground -mt-1">{label}</p>
    </div>
  </div>
);

export default function RoomCard({ room, professionalId }: RoomCardProps) {
  const hasUnreadMessages = useMemo(() => {
    if (!room) return false;
    const lastMessage = room.lastMessage;
    const lastReadTimestamp = room.lastRead?.[professionalId];

    if (!lastMessage || lastMessage.senderId === professionalId) return false;
    if (!lastReadTimestamp) return true; // No read timestamp means everything is unread
    
    const lastMessageDate = lastMessage.createdAt?.toDate ? lastMessage.createdAt.toDate() : new Date();
    return lastMessageDate > lastReadTimestamp.toDate();
  }, [room, professionalId]);

  const creationDate = room.createdAt?.toDate ? format(room.createdAt.toDate(), "dd 'de' MMM, yyyy", { locale: ptBR }) : 'Data indisponível';

  return (
    <Card className="relative flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl animate-fade-in">
        {hasUnreadMessages && (
            <div className="absolute top-2 right-2 z-10 p-2 bg-primary rounded-full animate-pulse">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
        )}
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 pr-10">
                <CardTitle>
                  {room.roomName}
                </CardTitle>
            </div>
        </div>
         <CardDescription className='flex items-center gap-2 pt-1'>
            <User className="h-4 w-4" /> 
            {room.patientInfo.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InfoItem icon={Calendar} label="Criação da sala" value={creationDate} />
          <InfoItem icon={Flame} label="Meta de Calorias" value={`${room.activePlan.calorieGoal} kcal`} />
          <InfoItem icon={Droplet} label="Meta de Hidratação" value={`${room.activePlan.hydrationGoal / 1000} L`} />
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/pro/room/${room.id}`} className='w-full'>
            <Button className="w-full">Ver Sala</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
