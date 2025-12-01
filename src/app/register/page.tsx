// src/app/register/page.tsx
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/types/user';
import { FaGoogle } from 'react-icons/fa';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const registerSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const LogoDisplay = () => {
  const logoImage = PlaceHolderImages.find(p => p.id === 'logo');
  return (
    <Image 
      src={logoImage?.imageUrl || ''}
      alt="Nutrinea Logo"
      width={140}
      height={35}
      priority
    />
  );
};

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      taxId: '',
      password: '',
      confirmPassword: '',
    },
  });

  // A lógica de redirecionamento foi movida para o layout principal (RootLayoutContent)
  // para centralizar a lógica e evitar loops.

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
      const shareCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const newUserProfile: Omit<UserProfile, 'id'> = {
        fullName: data.fullName,
        email: data.email,
        taxId: data.taxId,
        createdAt: serverTimestamp(),
        dashboardShareCode: shareCode,
        subscriptionStatus: 'free',
        profileType: 'patient',
        role: 'patient',
        unlockedAchievements: ['first-steps'],
        status: 'active'
      };
      
      await setDoc(userRef, newUserProfile);
      await updateProfile(user, { displayName: data.fullName });
      
      toast({
        title: "Bem-vindo(a)! 🎉",
        description: "Sua conta foi criada com sucesso.",
      });
      // O layout principal cuidará do redirecionamento
      
    } catch (error: any) {
      setLoading(false);
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    if (!auth) {
      toast({ title: "Erro de inicialização", description: "Serviço de autenticação indisponível.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // O onAuthStateChanged listener no provider cuidará da criação do perfil e o layout cuidará do redirecionamento.
    } catch (error: any) {
      setLoading(false);
      console.error("Google Sign-In Error", error);
      toast({
        title: "Erro com Google",
        description: error.message || 'Não foi possível fazer login com Google. Tente novamente.',
        variant: "destructive",
      });
    }
  };
  
  if (isUserLoading || user) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <LogoDisplay />
          </Link>
          <h1 className="text-3xl font-bold font-heading">
            Crie sua Conta
          </h1>
          <p className="text-muted-foreground mt-2">
            Comece sua jornada para uma vida mais saudável.
          </p>
        </div>
        
        <div className='space-y-4'>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading || isUserLoading}>
            <FaGoogle className="mr-2 h-4 w-4"/> Continuar com Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou crie com seu e-mail
              </span>
            </div>
          </div>

          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              
              <FormField control={registerForm.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl><Input placeholder="Seu nome" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              
              <FormField control={registerForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail *</FormLabel>
                  <FormControl><Input placeholder="seu@email.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={registerForm.control} name="taxId" render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ *</FormLabel>
                  <FormControl><Input placeholder="Seu CPF ou CNPJ" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={registerForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha *</FormLabel>
                  <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha *</FormLabel>
                  <FormControl><Input type="password" placeholder="Confirme sua senha" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <Button type="submit" className="w-full !mt-6" disabled={loading || isUserLoading}>
                {(loading || isUserLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Conta
              </Button>

            </form>
          </Form>
        </div>

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
