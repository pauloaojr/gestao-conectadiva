import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, X } from "lucide-react";

interface Patient {
  id: string;
  name: string;
}

interface CreateRecordFormProps {
  onSubmit: (record: any) => void;
  onCancel: () => void;
}

export const CreateRecordForm = ({ onSubmit, onCancel }: CreateRecordFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    diagnosis: "",
    notes: "",
    status: "",
    nextAppointment: ""
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search patients when user types (min 2 characters)
  useEffect(() => {
    const searchPatients = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, name')
          .in('status', ['active', 'pending'])
          .ilike('name', `%${searchQuery}%`)
          .order('name')
          .limit(10);
        
        if (error) throw error;
        setSearchResults(data || []);
        setShowResults(true);
      } catch (err: any) {
        console.error('Error searching patients:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectPatient = (patient: Patient) => {
    setFormData(prev => ({ 
      ...prev, 
      patientId: patient.id,
      patientName: patient.name 
    }));
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const handleClearPatient = () => {
    setFormData(prev => ({ 
      ...prev, 
      patientId: "",
      patientName: "" 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.diagnosis) {
      toast({
        title: "Erro",
        description: "Selecione um paciente e informe o diagnóstico.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const newRecord = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        status: formData.status || "Iniciando",
        nextAppointment: formData.nextAppointment || null
      };

      await onSubmit(newRecord);
      
      toast({
        title: "Sucesso",
        description: "Prontuário criado com sucesso!",
      });
    } catch (error) {
      console.error('Error creating record:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div ref={searchRef} className="relative">
        <Label htmlFor="patientSearch">Paciente *</Label>
        
        {formData.patientId ? (
          <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted">
            <span className="flex-1 text-sm">{formData.patientName}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClearPatient}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="patientSearch"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome do paciente para buscar..."
                className="pl-9"
                autoComplete="off"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className="px-3 py-2 cursor-pointer hover:bg-accent transition-colors text-sm"
                  >
                    {patient.name}
                  </div>
                ))}
              </div>
            )}
            
            {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3">
                <span className="text-sm text-muted-foreground">Nenhum paciente encontrado.</span>
              </div>
            )}
          </>
        )}
      </div>
      
      <div>
        <Label htmlFor="diagnosis">Diagnóstico *</Label>
        <Input
          id="diagnosis"
          value={formData.diagnosis}
          onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
          placeholder="Digite o diagnóstico principal"
          required
        />
      </div>
      
      <div>
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
      
      <div>
        <Label htmlFor="nextAppointment">Próxima Consulta</Label>
        <Input
          id="nextAppointment"
          type="date"
          value={formData.nextAppointment}
          onChange={(e) => setFormData(prev => ({ ...prev, nextAppointment: e.target.value }))}
        />
      </div>
      
      <div>
        <Label htmlFor="notes">Observações Iniciais</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Digite observações sobre o paciente ou tratamento"
          rows={3}
        />
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="clinic-gradient text-white"
          disabled={isSubmitting || !formData.patientId}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar Prontuário"
          )}
        </Button>
      </div>
    </form>
  );
};
