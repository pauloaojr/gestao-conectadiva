import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

interface Patient {
  id: string;
  name: string;
}

interface PatientSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (patientName: string, patientId?: string) => void;
  placeholder?: string;
}

export const PatientSearch = ({ value, onValueChange, onSelect, placeholder }: PatientSearchProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch patients from Supabase
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, name')
          .eq('status', 'active')
          .order('name', { ascending: true });
        
        if (error) throw error;
        
        setPatients(data || []);
        setFilteredPatients(data || []);
      } catch (err) {
        console.error('Error fetching patients:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Filter patients based on search
  useEffect(() => {
    const searchTerm = value.toLowerCase();
    
    if (!searchTerm) {
      setFilteredPatients(patients);
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
      
      return false;
    });
    
    setFilteredPatients(filtered);
  }, [value, patients]);

  const handleSelect = (patient: Patient) => {
    onSelect(patient.name, patient.id);
  };

  const handleInputChange = (newValue: string) => {
    console.log('PatientSearch - Input change:', newValue);
    onValueChange(newValue);
  };

  return (
    <Command shouldFilter={false} className="rounded-lg border shadow-md">
      <CommandInput 
        placeholder={placeholder || "Digite o nome ou iniciais..."}
        value={value}
        onValueChange={handleInputChange}
        className="h-9"
      />
      <CommandList className="max-h-[200px]">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Carregando pacientes...
          </div>
        ) : (
          <>
            <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
            <CommandGroup>
              {filteredPatients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  onSelect={() => handleSelect(patient)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === patient.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {patient.name}
                  <span className="ml-auto text-xs text-muted-foreground">
                    ID: {patient.id.slice(0, 8)}...
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
};
