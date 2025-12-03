// src/app/forgot-password/page.tsx
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
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth, usePWA } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formSchema = z.object({
  email: z.string().email('Por favor, insira um e-mail válido.'),
});

type ForgotPasswordFormValues = z.infer<typeof formSchema>;

const LogoDisplay = () => {
    const { isPWA } = usePWA();
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

    if (isPWA) {
        return <div className="inline-block mb-6">{LogoComponent}</div>;
    }

    return (
        <Link href="/" className="inline-block mb-6">
            {LogoComponent}
        </Link>
    );
};

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const handlePasswordReset = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSubmitted(true);
    } catch (error: any) {
      let description = 'Ocorreu um erro desconhecido. Tente novamente.';
      // We don't want to reveal if a user exists or not, so we avoid specific error messages.
      // But for better DX, we can log it.
      console.error("Password Reset Error:", error.code);
      // For a better user experience in case of a clear invalid email format error from Firebase,
      // we can show a specific message.
      if (error.code === 'auth/invalid-email') {
          description = "O formato do e-mail é inválido. Por favor, corrija e tente novamente."
      }
      toast({
        title: 'Erro ao Enviar E-mail',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <LogoDisplay />
          <h1 className="text-3xl font-bold font-heading">Redefinir Senha</h1>
          <p className="text-muted-foreground mt-2">
              {submitted 
              ? "Verifique sua caixa de entrada."
              : "Insira seu e-mail para receber o link."
              }
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className='w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto'>
              <Mail className="h-10 w-10" />
            </div>
            <p className="text-muted-foreground">
                Se uma conta com este e-mail existir, um link para redefinir sua senha foi enviado. O link expira em alguns minutos.
            </p>
            <Button asChild>
                <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Login
                </Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePasswordReset)} className="space-y-6">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Link de Redefinição
              </Button>
                <div className="text-center text-sm">
                  Lembrou a senha?{' '}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                      Faça login
                  </Link>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
