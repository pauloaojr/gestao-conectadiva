import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Medication } from "@/types/prescription";

interface Patient {
  id: string;
  name: string;
}

interface Attendant {
  id: string;
  name: string;
}

interface CreatePrescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    patient_id: string;
    patient_name: string;
    attendant_id: string;
    attendant_name: string;
    medications: Medication[];
    notes: string | null;
    diagnosis: string | null;
  }) => Promise<void>;
}

const emptyMedication: Medication = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: ""
};

export function CreatePrescriptionModal({ open, onOpenChange, onSubmit }: CreatePrescriptionModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedAttendantId, setSelectedAttendantId] = useState("");
  const [medications, setMedications] = useState<Medication[]>([{ ...emptyMedication }]);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch patients
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (patientsData) setPatients(patientsData);

      // Fetch attendants (profiles)
      const { data: attendantsData } = await supabase
        .from('profiles')
        .select('user_id, name')
        .eq('is_active', true)
        .order('name');
      
      if (attendantsData) {
        setAttendants(attendantsData.map(a => ({ id: a.user_id, name: a.name })));
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  const handleAddMedication = () => {
    setMedications([...medications, { ...emptyMedication }]);
  };

  const handleRemoveMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSubmit = async () => {
    const patient = patients.find(p => p.id === selectedPatientId);
    const attendant = attendants.find(a => a.id === selectedAttendantId);

    if (!patient || !attendant) return;

    // Filter out empty medications
    const validMedications = medications.filter(m => m.name.trim() !== "");
    if (validMedications.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        patient_id: patient.id,
        patient_name: patient.name,
        attendant_id: attendant.id,
        attendant_name: attendant.name,
        medications: validMedications,
        diagnosis: diagnosis || null,
        notes: notes || null
      });
      
      // Reset form
      setSelectedPatientId("");
      setSelectedAttendantId("");
      setMedications([{ ...emptyMedication }]);
      setDiagnosis("");
      setNotes("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = selectedPatientId && selectedAttendantId && medications.some(m => m.name.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Receita Médica</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para criar uma nova receita médica com paciente, atendente e medicamentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Patient and Attendant Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Atendente/Médico *</Label>
              <Select value={selectedAttendantId} onValueChange={setSelectedAttendantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o atendente" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {attendants.map(attendant => (
                    <SelectItem key={attendant.id} value={attendant.id}>
                      {attendant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="space-y-2">
            <Label>Diagnóstico</Label>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Diagnóstico do paciente"
            />
          </div>

          {/* Medications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Medicamentos *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMedication}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {medications.map((med, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Medicamento {index + 1}</span>
                  {medications.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMedication(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome do Medicamento *</Label>
                    <Input
                      value={med.name}
                      onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                      placeholder="Ex: Paracetamol"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dosagem</Label>
                    <Input
                      value={med.dosage}
                      onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                      placeholder="Ex: 500mg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Frequência</Label>
                    <Input
                      value={med.frequency}
                      onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                      placeholder="Ex: 8 em 8 horas"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duração</Label>
                    <Input
                      value={med.duration}
                      onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                      placeholder="Ex: 7 dias"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Instruções Especiais</Label>
                  <Input
                    value={med.instructions || ""}
                    onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                    placeholder="Ex: Tomar após as refeições"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Salvando..." : "Criar Receita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
