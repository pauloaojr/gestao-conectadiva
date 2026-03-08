import { useState, useEffect, useRef, useCallback } from "react";
import { Check, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Patient {
  id: string;
  name: string;
}

interface PatientAutocompleteProps {
  value: string;
  onChange: (value: string, patientId?: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Quando o paciente não existe, chamado ao clicar em "Cadastrar novo". Permite abrir modal de cadastro. */
  onRegisterNew?: (searchName: string) => void;
}

export const PatientAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Digite o nome do paciente...",
  autoFocus = false,
  onRegisterNew
}: PatientAutocompleteProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch patients from Supabase
  const fetchPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Filter patients based on search - real-time
  useEffect(() => {
    const searchTerm = value.toLowerCase().trim();
    
    if (!searchTerm || searchTerm.length < 2) {
      setFilteredPatients([]);
      return;
    }

    const filtered = patients.filter(patient => {
      const patientName = patient.name.toLowerCase();
      
      // Search by full name
      if (patientName.includes(searchTerm)) {
        return true;
      }
      
      // Search by initials
      const initials = patient.name
        .split(' ')
        .map(word => word.charAt(0).toLowerCase())
        .join('');
      
      if (initials.includes(searchTerm)) {
        return true;
      }
      
      // Search by first letters of each word
      const words = patient.name.toLowerCase().split(' ');
      const searchWords = searchTerm.split(' ');
      
      return searchWords.every(sw => 
        words.some(w => w.startsWith(sw))
      );
    });
    
    setFilteredPatients(filtered.slice(0, 8)); // Limit to 8 suggestions
  }, [value, patients]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSelectedPatientId(undefined); // Clear selected patient when typing
    onChange(newValue, undefined);
    setShowSuggestions(true);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    onChange(patient.name, patient.id);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (value.length >= 2 && filteredPatients.length > 0) {
      setShowSuggestions(true);
    }
  };

  const isNewPatient = value.trim().length > 0 && !selectedPatientId;
  const showNewPatientHint = isNewPatient && value.length >= 2 && filteredPatients.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className={cn(
            "pr-10",
            selectedPatientId && "border-green-500 focus-visible:ring-green-500"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : selectedPatientId ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : null}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (filteredPatients.length > 0 || showNewPatientHint) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredPatients.length > 0 ? (
            <ul className="py-1">
              {filteredPatients.map((patient) => (
                <li
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className={cn(
                    "px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-accent transition-colors",
                    selectedPatientId === patient.id && "bg-accent"
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      selectedPatientId === patient.id ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{patient.name}</span>
                </li>
              ))}
            </ul>
          ) : showNewPatientHint ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              <p className="mb-2">Paciente não encontrado.</p>
              {onRegisterNew ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    onRegisterNew(value.trim());
                    setShowSuggestions(false);
                  }}
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  Cadastrar novo paciente
                </Button>
              ) : (
                <span><strong>"{value}"</strong> será criado automaticamente.</span>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* New patient hint below input */}
      {isNewPatient && value.length >= 2 && !showSuggestions && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <UserPlus className="h-3 w-3" />
          Novo paciente será registrado
        </p>
      )}
    </div>
  );
};
