import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendRecoveryLinkChannels } from '@/services/sendRecoveryLink';
import { Key, Loader2, Copy, Check, Eye, EyeOff, Link2 } from 'lucide-react';

interface ResetPasswordModalProps {
  user: {
    id: string;
    user_id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ResetMode = 'link' | 'manual';

export const ResetPasswordModal = ({ user, open, onOpenChange }: ResetPasswordModalProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<ResetMode>('link');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [linkSendResult, setLinkSendResult] = useState<{ emailSent: boolean; whatsappSent: boolean; emailError?: string; whatsappError?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [manualPassword, setManualPassword] = useState('');
  const [showManualPassword, setShowManualPassword] = useState(false);

  const resetState = () => {
    setMode('link');
    setNewPassword(null);
    setRecoveryLink(null);
    setLinkSendResult(null);
    setCopied(false);
    setCopiedLink(false);
    setManualPassword('');
    setShowManualPassword(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (mode === 'manual') {
      if (!manualPassword || manualPassword.length < 6) {
        toast({
          title: "Senha inválida",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente e tente resetar a senha.",
          variant: "destructive"
        });
        return;
      }

      const isLinkOnly = mode === 'link';
      const body: Record<string, unknown> = {
        userId: user.user_id,
        email: user.email,
        redirectTo: typeof window !== 'undefined' ? (window.location.origin + (window.location.origin.endsWith('/') ? '' : '/')) : undefined
      };
      if (isLinkOnly) {
        body.onlyGenerateLink = true;
      } else {
        body.newPassword = manualPassword;
      }

      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        let errorMessage = 'Erro ao resetar senha';
        if (error.context?.body) {
          try {
            const errorBody = JSON.parse(error.context.body);
            if (errorBody.error) errorMessage = errorBody.error;
          } catch { /* ignore */ }
        }
        throw new Error(errorMessage);
      }

      if (data?.error) throw new Error(data.error);

      if (isLinkOnly) {
        const link = data?.recoveryLink;
        const errMsg = data?.recoveryError;
        if (link) {
          setRecoveryLink(link);
          const sendResult = await sendRecoveryLinkChannels(
            user.email,
            user.phone ?? null,
            user.name,
            link
          );
          setLinkSendResult(sendResult);
          if (sendResult.emailSent || sendResult.whatsappSent) {
            const channels: string[] = [];
            if (sendResult.emailSent) channels.push('e-mail');
            if (sendResult.whatsappSent) channels.push('WhatsApp');
            toast({
              title: "Link enviado",
              description: `Link de redefinição enviado por ${channels.join(' e ')}. Se o usuário não receber, copie o link exibido abaixo.`
            });
          } else if (sendResult.emailError || sendResult.whatsappError) {
            toast({
              title: "Link gerado",
              description: "E-mail e/ou WhatsApp não estão configurados ou falharam. Copie o link abaixo e envie ao usuário.",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Não foi possível gerar o link",
            description: errMsg || "Não foi possível gerar o link de redefinição. Tente definir a senha manualmente.",
            variant: "destructive"
          });
        }
        return;
      }

      if (data?.newPassword) {
        setNewPassword(data.newPassword);
        return;
      }

      toast({
        title: "Senha atualizada",
        description: `A senha de ${user.name} foi alterada com sucesso.`
      });
      handleClose();
    } catch (err: unknown) {
      toast({
        title: "Erro ao resetar senha",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (newPassword) {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      toast({ title: "Copiado!", description: "Senha copiada para a área de transferência." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    if (recoveryLink) {
      await navigator.clipboard.writeText(recoveryLink);
      setCopiedLink(true);
      toast({ title: "Link copiado!", description: "Envie este link ao usuário para redefinir a senha." });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!user) return null;

  const showLinkSuccess = recoveryLink != null;
  const showPasswordSuccess = newPassword != null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else onOpenChange(true);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Resetar Senha
          </DialogTitle>
          <DialogDescription className="sr-only">
            Escolha enviar link de redefinição por e-mail/WhatsApp ou definir senha manualmente.
          </DialogDescription>
        </DialogHeader>

        {showLinkSuccess ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Link de redefinição gerado</h4>
              <p className="text-sm text-green-800 mb-2">
                O link foi enviado por {linkSendResult?.emailSent ? 'e-mail' : ''}
                {linkSendResult?.emailSent && linkSendResult?.whatsappSent ? ' e ' : ''}
                {linkSendResult?.whatsappSent ? 'WhatsApp' : ''}
                {!linkSendResult?.emailSent && !linkSendResult?.whatsappSent
                  ? ' (e-mail e WhatsApp não configurados ou falharam)'
                  : '.'}
              </p>
              <p className="text-sm text-green-800 mb-3">
                Se o usuário não recebeu, copie o link abaixo e envie manualmente:
              </p>
              <div className="flex items-center gap-2">
                <Input value={recoveryLink} readOnly className="font-mono text-xs bg-white truncate" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">Fechar</Button>
          </div>
        ) : showPasswordSuccess ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Senha resetada com sucesso!</h4>
              <p className="text-sm text-green-800 mb-3">A nova senha de <strong>{user.name}</strong> é:</p>
              <div className="flex items-center gap-2">
                <Input value={newPassword} readOnly className="font-mono text-sm bg-white" />
                <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> Esta senha só será exibida uma vez. Informe ao usuário.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm"><strong>Usuário:</strong> {user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="modeLink"
                  name="resetMode"
                  checked={mode === 'link'}
                  onChange={() => setMode('link')}
                  className="w-4 h-4"
                />
                <Label htmlFor="modeLink" className="cursor-pointer flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Link de nova senha
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                O link é enviado por e-mail e por WhatsApp, se estiverem configurados. Caso o usuário não receba, o link será exibido para você copiar.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="radio"
                  id="modeManual"
                  name="resetMode"
                  checked={mode === 'manual'}
                  onChange={() => setMode('manual')}
                  className="w-4 h-4"
                />
                <Label htmlFor="modeManual" className="cursor-pointer flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Definir senha manualmente
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                O admin define uma nova senha e entrega diretamente ao usuário.
              </p>
            </div>

            {mode === 'manual' && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="newPassword">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showManualPassword ? 'text' : 'password'}
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowManualPassword(!showManualPassword)}
                  >
                    {showManualPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (mode === 'manual' && (!manualPassword || manualPassword.length < 6))}
                className="clinic-gradient text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === 'link' ? 'Gerando link...' : 'Resetando...'}
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    {mode === 'link' ? 'Gerar e enviar link' : 'Resetar senha'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
