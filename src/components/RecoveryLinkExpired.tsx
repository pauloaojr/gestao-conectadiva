import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface RecoveryLinkExpiredProps {
  onGoToLogin: () => void;
}

/**
 * Exibido quando o usuário abre um link de redefinição de senha que expirou ou já foi utilizado.
 */
export function RecoveryLinkExpired({ onGoToLogin }: RecoveryLinkExpiredProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Link inválido ou expirado
          </CardTitle>
          <CardDescription>
            Este link de redefinição de senha já foi utilizado ou expirou (os links são válidos por pouco tempo).
            Peça um novo link ao administrador do sistema e use-o em até 1 hora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onGoToLogin} className="w-full">
            Ir para a tela de login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
