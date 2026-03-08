
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateRecordForm } from "./forms/CreateRecordForm";

interface CreateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordCreated: (record: any) => void;
}

export const CreateRecordModal = ({ isOpen, onClose, onRecordCreated }: CreateRecordModalProps) => {
  const handleRecordCreated = (record: any) => {
    onRecordCreated(record);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Novo Prontuário</DialogTitle>
          <DialogDescription className="text-sm">
            Crie um novo prontuário médico para acompanhar o tratamento do paciente.
          </DialogDescription>
        </DialogHeader>
        
        <CreateRecordForm
          onSubmit={handleRecordCreated}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};
