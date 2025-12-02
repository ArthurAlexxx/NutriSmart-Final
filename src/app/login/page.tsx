'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { FaGoogle } from 'react-icons/fa';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
};

const formSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type LoginFormValues = z.infer<typeof formSchema>;

const LogoDisplay = () => {
    const [isPwa, setIsPwa] = useState(false);

    useEffect(() => {
        setIsPwa(window.matchMedia('(display-mode: standalone)').matches);
    }, []);

    const logoImage = PlaceHolderImages.find(p => p.id === 'logo');
    const LogoComponent = (
        <Image 
            src={logoImage?.imageUrl || ''}
            alt="Nutrinea Logo"
            width={160}
            height={40}
            priority
        />
    );

    if (isPwa) {
        return <div className="inline-block mb-6">{LogoComponent}</div>;
    }

    return (
        <Link href="/" className="inline-block mb-6">
            {LogoComponent}
        </Link>
    );
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // A notificação de sucesso foi removida.
      // O redirecionamento é tratado pelo RootLayoutContent.
    } catch (error: any) {
      setLoading(false);
      let description = "Ocorreu um erro desconhecido. Por favor, tente novamente.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          description = "E-mail ou senha inválidos.";
      } else if (error.code === 'auth/invalid-email') {
          description = "O formato do e-mail é inválido.";
      } else {
          console.error("Login Error:", error);
      }
      toast({
        title: "Erro no Login",
        description,
        variant: 'destructive',
      });
    }
    // Não alteramos o loading para false em caso de sucesso, pois o redirecionamento
    // ocorrerá e desmontará este componente.
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener and RootLayoutContent will handle profile creation and redirection.
    } catch (error: any) {
      console.error("Google Sign-In Error", error);
       toast({
        title: "Erro com Google",
        description: error.message || 'Não foi possível fazer login com Google. Tente novamente.',
        variant: "destructive",
      });
      setLoading(false); // Reset loading state on error
    }
  };
  
  if (loading) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
            <LogoDisplay />
            <h1 className="text-3xl font-bold font-heading">Bem-vindo de volta!</h1>
            <p className="text-muted-foreground mt-2">Faça login para continuar sua jornada.</p>
        </div>
        
        <div className='space-y-4'>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FaGoogle className="mr-2 h-4 w-4"/>}
                Continuar com Google
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
                <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
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
                         <FormLabel>Senha</FormLabel>
                        <FormControl>
                        <Input type="password" placeholder="Sua senha" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <div className="flex items-center justify-end">
                     <Link
                        href="/forgot-password"
                        className="text-sm font-semibold text-primary hover:underline"
                    >
                        Esqueceu a senha?
                    </Link>
                </div>
                <Button type="submit" className="w-full !mt-6" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
