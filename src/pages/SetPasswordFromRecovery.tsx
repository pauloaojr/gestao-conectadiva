import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Key, Loader2, Eye, EyeOff } from 'lucide-react';

interface SetPasswordFromRecoveryProps {
  onDone: () => void;
}

function getHashParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash || '';
  const q = hash.indexOf('?');
  return q >= 0 ? new URLSearchParams(hash.slice(q)) : new URLSearchParams();
}

/**
 * Tela exibida quando o usuário abre o link de recuperação de senha (reset pelo admin).
 * Modos: (1) reset_token na URL → nosso JWT; (2) token_hash → exchange-recovery-token; (3) sessão do redirect Supabase.
 */
export default function SetPasswordFromRecovery({ onDone }: SetPasswordFromRecoveryProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const verifyAttempted = useRef(false);

  const params = getHashParams();
  const resetToken = params.get('reset_token');
  const useResetTokenMode = !!resetToken?.trim();

  useEffect(() => {
    if (useResetTokenMode) {
      setSessionReady(true);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSessionReady(true);
    });

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        return;
      }

      const tokenHash = params.get('token_hash');
      const type = params.get('type') || 'recovery';

      if (tokenHash && type === 'recovery' && !verifyAttempted.current) {
        verifyAttempted.current = true;
        const { data, error } = await supabase.functions.invoke('exchange-recovery-token', {
          body: { token_hash: tokenHash, type: 'recovery' },
        });
        if (error) {
          setVerifyError(error.message || 'Erro ao validar o link.');
          return;
        }
        const errMsg = (data as { error?: string })?.error;
        if (errMsg) {
          setVerifyError(errMsg);
          return;
        }
        const sessionData = (data as { session?: { access_token: string; refresh_token: string } })?.session;
        if (sessionData?.access_token && sessionData?.refresh_token) {
          const { error: setErr } = await supabase.auth.setSession(sessionData);
          if (setErr) {
            setVerifyError(setErr.message);
            return;
          }
          const hash = window.location.hash || '';
          const base = hash.split('?')[0] || '#/redefinir-senha';
          window.history.replaceState(null, '', window.location.pathname + window.location.search + base);
          setSessionReady(true);
        } else {
          setVerifyError('Resposta inválida. Gere um novo link.');
        }
      }
    };

    init();
    return () => subscription.unsubscribe();
  }, [useResetTokenMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({
        title: 'Senha curta',
        description: 'A senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: 'Senhas diferentes',
        description: 'Nova senha e confirmação não conferem.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (useResetTokenMode && resetToken) {
        const { data, error } = await supabase.functions.invoke('set-password-with-reset-token', {
          body: { reset_token: resetToken, new_password: password },
        });
        if (error) throw new Error(error.message);
        const errMsg = (data as { error?: string })?.error;
        if (errMsg) throw new Error(errMsg);
        const session = (data as { session?: { access_token: string; refresh_token: string } })?.session;
        if (session?.access_token && session?.refresh_token) {
          const { error: setErr } = await supabase.auth.setSession(session);
          if (setErr) {
            toast({
              title: 'Senha definida',
              description: 'Faça login com seu e-mail e a nova senha.',
            });
          } else {
            toast({
              title: 'Senha definida',
              description: 'Entrando...',
            });
          }
          window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/');
          window.location.hash = '#/';
          onDone();
          return;
        }
        toast({
          title: 'Senha definida',
          description: 'Faça login com seu e-mail e a nova senha.',
        });
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/');
        window.location.hash = '#/';
        onDone();
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      try {
        await supabase.auth.updateUser({
          data: { password_changed_at: new Date().toISOString().split('T')[0] },
        });
      } catch {
        // Ignora falha na metadata; a senha já foi atualizada
      }
      toast({
        title: 'Senha definida',
        description: 'Agora você pode fazer login com seu e-mail e esta senha.',
      });
      window.location.hash = '#/';
      onDone();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        title: 'Erro ao definir senha',
        description: msg || 'Tente novamente. Verifique se a senha atende aos requisitos (ex.: mínimo de caracteres).',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verifyError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Link inválido ou expirado</CardTitle>
            <CardDescription>{verifyError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => {
                window.location.hash = '#/';
                onDone();
              }}
            >
              Ir para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Preparando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Definir nova senha
          </CardTitle>
          <CardDescription>
            Defina uma senha para acessar o sistema. Use-a na próxima vez que fizer login com seu e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                  autoComplete="new-password"
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                className="pr-10"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : useResetTokenMode ? (
                'Definir senha'
              ) : (
                'Definir senha e entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
