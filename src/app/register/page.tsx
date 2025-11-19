// src/app/register/page.tsx
'use client';

import * as React from 'react';
import { useState, Suspense, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types';


const registerSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string(),
  profileType: z.enum(['patient', 'professional'], {
    required_error: 'Selecione o tipo de perfil.',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;


function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, userProfile, isUserLoading } = useUser();
  
  const defaultProfileType = searchParams.get('type') === 'pro' ? 'professional' : 'patient';

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      profileType: defaultProfileType,
    },
  });
  
  useEffect(() => {
    if (!isUserLoading && user && userProfile) {
        toast({
            title: "Bem-vindo(a)! 🎉",
            description: "Sua conta foi criada com sucesso.",
        });
        const destination = userProfile.profileType === 'professional' ? '/pro/patients' : '/dashboard';
        router.push(destination);
    }
  }, [user, userProfile, isUserLoading, router, toast]);

  const profileType = registerForm.watch('profileType');

  const handleRegister = async (data: RegisterFormValues) => {
    setLoading(true);
    if (!auth || !firestore) {
      toast({ title: "Erro de inicialização", description: "Serviços indisponíveis. Tente novamente mais tarde.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      const userRef = doc(firestore, 'users', user.uid);

      const newUserProfile: Omit<UserProfile, 'id'> = {
          fullName: data.fullName,
          email: data.email,
          createdAt: serverTimestamp(),
          profileType: data.profileType as 'patient' | 'professional',
          role: data.profileType,
          subscriptionStatus: 'free',
      };
      
      if (data.profileType === 'patient') {
          const shareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
          newUserProfile.dashboardShareCode = shareCode;
      }
      
      await setDoc(userRef, {id: user.uid, ...newUserProfile});
      await updateProfile(user, { displayName: data.fullName });
      
      // The useEffect will now handle the redirection once the profile is loaded.
      // No need to call router.push here.

    } catch (error: any) {
        setLoading(false); // Stop loading on error
        let description = 'Ocorreu um erro desconhecido. Por favor, tente novamente.';
        if (error.code === 'auth/email-already-in-use') {
            description = 'Este e-mail já está sendo utilizado por outra conta.';
        } else if (error.code === 'auth/weak-password') {
            description = 'A senha é muito fraca. Tente uma senha mais forte com pelo menos 6 caracteres.';
        } else if (error.code === 'auth/invalid-email') {
            description = 'O e-mail fornecido é inválido.';
        }

        toast({ title: 'Erro no Cadastro', description, variant: 'destructive' });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6 text-2xl font-bold font-heading text-primary">
                NutriSmart
            </Link>
            <h1 className="text-3xl font-bold font-heading">
                Crie sua Conta
            </h1>
            <p className="text-muted-foreground mt-2">
                Comece sua jornada para uma vida mais saudável.
            </p>
        </div>
        
        <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                
                <FormField
                    control={registerForm.control}
                    name="profileType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Qual é o seu objetivo?</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-2 gap-4"
                                >
                                <FormItem>
                                    <FormControl>
                                        <RadioGroupItem value="patient" id="patient" className="sr-only" />
                                    </FormControl>
                                    <FormLabel
                                    htmlFor="patient"
                                    className={cn(
                                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        field.value === 'patient' && "border-primary"
                                    )}
                                    >
                                    <Users className="mb-3 h-6 w-6" />
                                    Paciente
                                    </FormLabel>
                                </FormItem>
                                 <FormItem>
                                    <FormControl>
                                        <RadioGroupItem value="professional" id="professional" className="sr-only" />
                                    </FormControl>
                                    <FormLabel
                                    htmlFor="professional"
                                    className={cn(
                                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        field.value === 'professional' && "border-primary"
                                    )}
                                    >
                                    <Stethoscope className="mb-3 h-6 w-6" />
                                    Profissional
                                    </FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField control={registerForm.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={registerForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={registerForm.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem><FormLabel>Confirmar Senha</FormLabel><FormControl><Input type="password" placeholder="Confirme sua senha" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <Button type="submit" className="w-full !mt-6" disabled={loading || isUserLoading}>
                    {(loading || isUserLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Conta
                </Button>
            </form>
        </Form>
        <div className="mt-6 text-center text-sm">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
            Faça login
            </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <RegisterForm />
        </Suspense>
    );
}
