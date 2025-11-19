// src/app/pro/library/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import AppLayout from '@/components/app-layout';
import CreatePlanTemplateModal from '@/components/pro/create-plan-template-modal';
import type { PlanTemplate } from '@/types/library';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, PlusCircle, Library, FileText, Pencil, Trash2, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

function TemplateCard({ template, onEdit, onDelete }: { template: PlanTemplate, onEdit: () => void, onDelete: () => void }) {
    return (
        <Card className="flex flex-col h-full shadow-sm hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription className="line-clamp-2 h-[40px]">{template.description || 'Sem descrição'}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Calorias:</strong> {template.calorieGoal} kcal</p>
                    <p><strong>Refeições:</strong> {template.meals.length}</p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-2 h-4 w-4"/>Editar</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação removerá permanentemente o modelo "{template.name}".</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}


export default function LibraryPage() {
    const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isUserLoading && (!user || userProfile?.profileType !== 'professional')) {
            router.push('/dashboard');
        }
    }, [user, userProfile, isUserLoading, router]);

    const templatesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'plan_templates'), orderBy('createdAt', 'desc'));
    }, [user, firestore]);

    const { data: templates, isLoading } = useCollection<PlanTemplate>(templatesQuery);

    const filteredTemplates = useMemo(() => {
        if (!templates) return [];
        return templates.filter(template => 
            template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [templates, searchTerm]);

    const handleEdit = (template: PlanTemplate) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setSelectedTemplate(null);
        setIsModalOpen(true);
    };
    
    const handleDelete = async (templateId: string) => {
        if (!firestore || !user) return;
        try {
            await deleteDoc(doc(firestore, 'users', user.uid, 'plan_templates', templateId));
            toast({ title: 'Modelo Excluído', description: 'O modelo de plano foi removido da sua biblioteca.' });
        } catch (error) {
            toast({ title: 'Erro ao Excluir', variant: 'destructive' });
        }
    };

    if (isUserLoading || isLoading) {
        return (
            <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
                <div className="flex h-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
            </AppLayout>
        );
    }

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 text-center sm:text-left gap-4">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-foreground font-heading">Biblioteca de Planos</h1>
                        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto sm:mx-0">Crie, edite e gerencie seus modelos de planos alimentares para agilizar o atendimento.</p>
                    </div>
                    <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Modelo</Button>
                </div>

                <div className="mb-8 relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Buscar modelos por nome ou descrição..."
                      className="w-full rounded-lg bg-background pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {filteredTemplates && filteredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onEdit={() => handleEdit(template)}
                                onDelete={() => handleDelete(template.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="mt-12 text-center">
                         <Card className="max-w-2xl mx-auto shadow-sm rounded-2xl animate-fade-in border-dashed">
                            <CardHeader className="text-center p-8">
                                <Library className="h-12 w-12 text-primary mx-auto mb-4" />
                                <CardTitle className="text-2xl font-heading">{templates && templates.length > 0 ? 'Nenhum Modelo Encontrado' : 'Sua Biblioteca está vazia'}</CardTitle>
                                <CardDescription className="mt-2">
                                     {templates && templates.length > 0 ? 'Tente uma busca diferente.' : 'Crie seu primeiro modelo de plano para reutilizá-lo com seus pacientes e poupar tempo.'}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                )}
            </div>
            {user && (
                <CreatePlanTemplateModal
                    isOpen={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    userId={user.uid}
                    template={selectedTemplate}
                />
            )}
        </AppLayout>
    );
}
