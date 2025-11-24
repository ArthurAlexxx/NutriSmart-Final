// src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft, LogIn } from 'lucide-react';
import { signInWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider, sendEmailVerification, type User } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { FaGoogle } from 'react-icons/fa';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const { user, effectiveSubscriptionStatus, isUserLoading, isAdmin } = useUser();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  useEffect(() => {
    // This effect handles redirection AFTER the user state is fully resolved.
    if (!isUserLoading && user) {
        if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
            // This case should be handled by handleLogin, but as a safeguard.
            return;
        }

        toast({
            title: "Login bem-sucedido!",
            description: "Redirecionando para o seu painel...",
        });

        if (isAdmin) {
            router.push('/admin');
        } else {
            const destination = effectiveSubscriptionStatus === 'professional' ? '/pro/patients' : '/dashboard';
            router.push(destination);
        }
    }
  }, [user, effectiveSubscriptionStatus, isUserLoading, isAdmin, router, toast]);

  const handleResendVerification = async (userToVerify: User) => {
    if (isResending) return;
    setIsResending(true);
    try {
      await sendEmailVerification(userToVerify);
      toast({
        title: "E-mail de Verificação Reenviado",
        description: "Verifique sua caixa de entrada para o novo link. Pode levar alguns minutos.",
      });
    } catch (error: any) {
      console.error("Resend Verification Error:", error);
      let description = "Não foi possível reenviar o e-mail. Se o problema persistir, verifique as configurações do projeto ou tente novamente mais tarde.";
      if (error.code === 'auth/too-many-requests') {
          description = "Muitas tentativas de reenvio. Por favor, aguarde um momento antes de tentar novamente.";
      }
      toast({
        title: "Erro ao Reenviar",
        description,
        variant: "destructive",
      });
    } finally {
        setIsResending(false);
    }
  };


  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    if (!auth) {
      toast({ title: "Erro de inicialização", description: "Serviço de autenticação indisponível.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);

      // Check for email verification
      if (!userCredential.user.emailVerified) {
          const userToVerify = userCredential.user;
          await signOut(auth); // Sign out the user immediately
          setLoading(false);
          toast({
              title: "Verificação Necessária",
              description: "Seu e-mail ainda não foi verificado. Por favor, verifique sua caixa de entrada.",
              variant: "destructive",
              duration: 8000,
              action: (
                <Button variant="secondary" onClick={() => handleResendVerification(userToVerify)} disabled={isResending}>
                   {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reenviar E-mail
                </Button>
              ),
          });
          return;
      }
      
      // If verified, the useEffect will handle the redirect.
      
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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6 text-2xl font-bold font-heading text-primary">
                Nutrinea
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
