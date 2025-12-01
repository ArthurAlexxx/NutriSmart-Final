// src/app/login/page.tsx
'use client';

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
import { Loader2, ArrowLeft, LogIn } from 'lucide-react';
import { signInWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider, sendEmailVerification, type User } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { FaGoogle } from 'react-icons/fa';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type LoginFormValues = z.infer<typeof formSchema>;

const LogoDisplay = () => {
    const logoImage = PlaceHolderImages.find(p => p.id === 'logo');
    return (
        <Image 
            src={logoImage?.imageUrl || ''}
            alt="Nutrinea Logo"
            width={160}
            height={40}
            priority
        />
    );
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const { user, userProfile, isUserLoading } = useUser();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  useEffect(() => {
    // This effect handles redirection AFTER the user state and profile are fully resolved.
    if (!isUserLoading && user && userProfile) {
        const isAdmin = userProfile.role === 'admin';
        const isPro = userProfile.profileType === 'professional';

        if (isAdmin) {
            router.push('/admin');
        } else {
            const destination = isPro ? '/pro/patients' : '/dashboard';
            router.push(destination);
        }
    }
  }, [user, userProfile, isUserLoading, router, toast]);


  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    if (!auth) {
      toast({ title: "Erro de inicialização", description: "Serviço de autenticação indisponível.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // The useEffect will handle the redirect on successful login.
      toast({
          title: "Login bem-sucedido!",
          description: "Redirecionando para o seu painel...",
      });
      
    } catch (error: any) {
      setLoading(false); // Stop loading on error
      let description = "Ocorreu um erro desconhecido. Por favor, tente novamente.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          description = "E-mail ou senha inválidos.";
      } else if (error.code === 'auth/invalid-email') {
          description = "O formato do e-mail é inválido.";
      } else {
          description = error.message;
      }
      toast({
        title: "Erro no Login",
        description,
        variant: 'destructive',
      });
    }
    // No finally block to set loading to false, as the useEffect handles the final state.
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
      // The onAuthStateChanged listener will handle user creation and redirection
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
  
  // Show a loading spinner while the user's auth state is being determined
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
            <h1 className="text-3xl font-bold font-heading">Bem-vindo de volta!</h1>
            <p className="text-muted-foreground mt-2">Faça login para continuar sua jornada.</p>
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
                    Ou continue com
                    </span>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                        <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <div className="flex justify-between items-center">
                            <FormLabel>Senha</FormLabel>
                            <Link
                                href="/forgot-password"
                                className="text-xs font-semibold text-primary hover:underline"
                            >
                                Esqueceu a senha?
                            </Link>
                        </div>
                        <FormControl>
                        <Input type="password" placeholder="Sua senha" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={loading || isUserLoading}>
                    {(loading || isUserLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                </Button>
                </form>
            </Form>
        </div>
        <div className="mt-6 text-center text-sm">
            Não tem uma conta?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
            Cadastre-se
            </Link>
        </div>
      </div>
    </div>
  );
}
