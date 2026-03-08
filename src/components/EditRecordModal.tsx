import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface MedicalRecord {
  id: string;
  patientName: string;
  patientId: string;
  lastUpdate: string;
  diagnosis: string;
  sessions: number;
  status: string;
  notes: string;
  nextAppointment: string;
}

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MedicalRecord | null;
  onUpdate: (updatedRecord: MedicalRecord) => void;
}

const EditRecordModal = ({ isOpen, onClose, record, onUpdate }: EditRecordModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    diagnosis: '',
    notes: '',
    status: '',
    sessions: 0,
    nextAppointment: ''
  });

  // Update form data when record changes
  useEffect(() => {
    if (record) {
      // Convert display date to input format
      const convertDateToInput = (dateStr: string): string => {
        if (!dateStr || dateStr === 'A definir' || dateStr === '-') return '';
        // If already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // Convert from DD/MM/YYYY to YYYY-MM-DD
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return '';
      };

      setFormData({
        diagnosis: record.diagnosis || '',
        notes: record.notes || '',
        status: record.status || '',
        sessions: record.sessions || 0,
        nextAppointment: convertDateToInput(record.nextAppointment)
      });
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setIsSubmitting(true);

    try {
      // Convert date back to display format
      const formatDateForDisplay = (dateStr: string): string => {
        if (!dateStr) return 'A definir';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      };

      const updatedRecord: MedicalRecord = {
        ...record,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        status: formData.status,
        sessions: formData.sessions,
        nextAppointment: formData.nextAppointment 
          ? formatDateForDisplay(formData.nextAppointment) 
          : 'A definir'
      };

      await onUpdate(updatedRecord);
      onClose();
    } catch (error) {
      console.error('Error updating record:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Prontuário - {record.patientName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Paciente</Label>
            <Input
              id="patient"
              value={record.patientName}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnóstico *</Label>
            <Input
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="Digite o diagnóstico principal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status do Tratamento</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Iniciando">Iniciando</SelectItem>
                <SelectItem value="Em Tratamento">Em Tratamento</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
                <SelectItem value="Pausado">Pausado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessions">Número de Sessões</Label>
            <Input
              id="sessions"
              type="number"
              min="0"
              value={formData.sessions}
              onChange={(e) => setFormData(prev => ({ ...prev, sessions: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextAppointment">Próxima Consulta</Label>
            <Input
              id="nextAppointment"
              type="date"
              value={formData.nextAppointment}
              onChange={(e) => setFormData(prev => ({ ...prev, nextAppointment: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações Clínicas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Digite observações sobre o paciente ou tratamento..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="clinic-gradient text-white" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecordModal;
