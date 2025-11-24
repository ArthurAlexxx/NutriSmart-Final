
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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';

const formSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
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


  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    if (!auth) {
      toast({ title: "Erro de inicialização", description: "Serviço de autenticação indisponível.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      // This just initiates the login. The useEffect above will handle the redirect.
      await signInWithEmailAndPassword(auth, values.email, values.password);
      
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
                    <div className="flex justify-between">
                        <FormLabel>Senha</FormLabel>
                        <Link
                            href="/forgot-password"
                            className="ml-auto inline-block text-xs text-primary underline"
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
