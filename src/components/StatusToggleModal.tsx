
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface StatusToggleModalProps {
  patient: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (patientId: number, newStatus: string) => void;
}

const StatusToggleModal = ({ patient, open, onOpenChange, onStatusChange }: StatusToggleModalProps) => {
  const { toast } = useToast();
  const newStatus = patient.status === "Ativo" ? "Inativo" : "Ativo";

  const handleConfirm = () => {
    onStatusChange(patient.id, newStatus);
    onOpenChange(false);
    toast({
      title: "Status alterado",
      description: `${patient.name} agora está ${newStatus}`,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterar status do paciente</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja alterar o status de <strong>{patient.name}</strong> de{" "}
            <strong>{patient.status}</strong> para <strong>{newStatus}</strong>?
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

export default StatusToggleModal;
