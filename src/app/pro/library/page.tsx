// src/app/pro/library/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import AppLayout from '@/components/app-layout';
import CreatePlanTemplateModal from '@/components/pro/create-plan-template-modal';
import CreateGuidelineModal from '@/components/pro/create-guideline-modal';
import type { PlanTemplate, Guideline } from '@/types/library';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, PlusCircle, Library, FileText, Pencil, Trash2, Search, BookCopy, FilePlus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

function GuidelineCard({ guideline, onDelete }: { guideline: Guideline, onDelete: () => void }) {
    return (
        <Card className="flex flex-col h-full shadow-sm hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><FileText className="h-5 w-5 text-primary" /> {guideline.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{guideline.content}</p>
            </CardContent>
            <CardFooter className="flex justify-end">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação removerá permanentemente a orientação "{guideline.title}".</AlertDialogDescription>
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
    const { user, userProfile, isUserLoading, onProfileUpdate, effectiveSubscriptionStatus } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
    const [isGuidelineModalOpen, setGuidelineModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isUserLoading && (!user || effectiveSubscriptionStatus !== 'professional')) {
            router.push('/dashboard');
        }
    }, [user, effectiveSubscriptionStatus, isUserLoading, router]);

    const templatesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'plan_templates'), orderBy('createdAt', 'desc'));
    }, [user, firestore]);

    const guidelinesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'guidelines'), orderBy('createdAt', 'desc'));
    }, [user, firestore]);

    const { data: templates, isLoading: isLoadingTemplates } = useCollection<PlanTemplate>(templatesQuery);
    const { data: guidelines, isLoading: isLoadingGuidelines } = useCollection<Guideline>(guidelinesQuery);

    const filteredTemplates = useMemo(() => {
        if (!templates) return [];
        return templates.filter(template => 
            template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [templates, searchTerm]);
    
    const filteredGuidelines = useMemo(() => {
        if (!guidelines) return [];
        return guidelines.filter(guideline => 
            guideline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            guideline.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [guidelines, searchTerm]);


    const handleEditTemplate = (template: PlanTemplate) => {
        setSelectedTemplate(template);
        setTemplateModalOpen(true);
    };

    const handleAddNewTemplate = () => {
        setSelectedTemplate(null);
        setTemplateModalOpen(true);
    };
    
    const handleDeleteTemplate = async (templateId: string) => {
        if (!firestore || !user) return;
        try {
            await deleteDoc(doc(firestore, 'users', user.uid, 'plan_templates', templateId));
            toast({ title: 'Modelo Excluído', description: 'O modelo de plano foi removido da sua biblioteca.' });
        } catch (error) {
            toast({ title: 'Erro ao Excluir', variant: 'destructive' });
        }
    };
    
    const handleDeleteGuideline = async (guidelineId: string) => {
        if (!firestore || !user) return;
        try {
            await deleteDoc(doc(firestore, 'users', user.uid, 'guidelines', guidelineId));
            toast({ title: 'Orientação Excluída' });
        } catch (error) {
            toast({ title: 'Erro ao Excluir', variant: 'destructive' });
        }
    };


    if (isUserLoading || isLoadingTemplates || isLoadingGuidelines) {
        return (
            <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
                <div className="flex h-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
            </AppLayout>
        );
    }

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
             <div className='p-4 sm:p-6 lg:p-8 pb-16 sm:pb-8'>
             <Tabs defaultValue="templates" className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 text-center sm:text-left gap-4">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold font-heading flex items-center gap-3 justify-center sm:justify-start">
                            <Library className="h-8 w-8 text-primary"/>
                            Biblioteca de Conteúdo
                        </h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl mx-auto sm:mx-0">Crie, edite e gerencie seus modelos e orientações para agilizar o atendimento.</p>
                    </div>
                     <div className='flex items-center gap-2'>
                        <Button onClick={handleAddNewTemplate}><BookCopy className="mr-2 h-4 w-4" /> Novo Modelo</Button>
                        <Button onClick={() => setGuidelineModalOpen(true)} variant="outline"><FilePlus className="mr-2 h-4 w-4" /> Nova Orientação</Button>
                    </div>
                </div>
                 <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <TabsList className="grid w-full sm:w-auto grid-cols-2">
                        <TabsTrigger value="templates">Modelos de Plano</TabsTrigger>
                        <TabsTrigger value="guidelines">Orientações</TabsTrigger>
                    </TabsList>
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Buscar na biblioteca..."
                          className="w-full rounded-lg bg-background pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                 </div>

                <TabsContent value="templates">
                    {filteredTemplates && filteredTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTemplates.map(template => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    onEdit={() => handleEditTemplate(template)}
                                    onDelete={() => handleDeleteTemplate(template.id)}
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
                                         {templates && templates.length > 0 ? 'Tente uma busca diferente.' : 'Crie seu primeiro modelo de plano para reutilizá-lo com seus pacientes.'}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="guidelines">
                     {filteredGuidelines && filteredGuidelines.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredGuidelines.map(guideline => (
                                <GuidelineCard
                                    key={guideline.id}
                                    guideline={guideline}
                                    onDelete={() => handleDeleteGuideline(guideline.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-12 text-center">
                             <Card className="max-w-2xl mx-auto shadow-sm rounded-2xl animate-fade-in border-dashed">
                                <CardHeader className="text-center p-8">
                                    <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                                    <CardTitle className="text-2xl font-heading">{guidelines && guidelines.length > 0 ? 'Nenhuma Orientação Encontrada' : 'Nenhuma Orientação Criada'}</CardTitle>
                                    <CardDescription className="mt-2">
                                         {guidelines && guidelines.length > 0 ? 'Tente uma busca diferente.' : 'Crie sua primeira orientação para enviar aos pacientes (ex: lista de compras, dicas).'}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            </div>
            {user && (
                <>
                    <CreatePlanTemplateModal
                        isOpen={isTemplateModalOpen}
                        onOpenChange={setTemplateModalOpen}
                        userId={user.uid}
                        template={selectedTemplate}
                    />
                    <CreateGuidelineModal
                        isOpen={isGuidelineModalOpen}
                        onOpenChange={setGuidelineModalOpen}
                        userId={user.uid}
                    />
                </>
            )}
        </AppLayout>
    );
}
