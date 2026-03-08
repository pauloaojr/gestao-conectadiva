
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types/user";

interface UserStatusToggleModalProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const UserStatusToggleModal = ({ user, open, onOpenChange, onConfirm }: UserStatusToggleModalProps) => {
  const { toast } = useToast();
  const newStatus = user.isActive ? "Inativo" : "Ativo";

  const handleConfirm = () => {
    onConfirm();
    toast({
      title: "Status alterado",
      description: `${user.name} agora está ${newStatus}`,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterar status do usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja alterar o status de <strong>{user.name}</strong> de{" "}
            <strong>{user.isActive ? 'Ativo' : 'Inativo'}</strong> para <strong>{newStatus}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Alterar para {newStatus}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UserStatusToggleModal;
