
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { SCHEDULE_DAYS, ScheduleDay } from '@/types/schedule';

interface AddTimeSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (timeSlot: { time: string; days: string[]; available: boolean }) => void;
  initialData?: { time: string; days: string[]; available?: boolean };
  isEdit?: boolean;
}

export const AddTimeSlotModal = ({ open, onOpenChange, onSubmit, initialData, isEdit = false }: AddTimeSlotModalProps) => {
  const [formData, setFormData] = useState({
    time: '',
    days: [] as string[],
    available: true
  });

  useEffect(() => {
    if (initialData && open) {
      setFormData({
        time: initialData.time,
        days: initialData.days,
        available: initialData.available ?? true
      });
    } else if (!open) {
      setFormData({ time: '', days: [], available: true });
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.time || formData.days.length === 0) {
      return;
    }

    onSubmit(formData);
    setFormData({ time: '', days: [], available: true });
    onOpenChange(false);
  };

  const toggleDay = (day: ScheduleDay) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Horário' : 'Adicionar Horário'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? 'Formulário para editar horário e dias da semana.' : 'Formulário para adicionar um novo horário e dias da semana.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Dias da Semana</Label>
            <div className="grid grid-cols-2 gap-2">
              {SCHEDULE_DAYS.slice(0, 5).map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={formData.days.includes(day) ? "default" : "outline"}
                  className={`h-12 text-sm font-medium ${
                    formData.days.includes(day) 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </Button>
              ))}
              
              <div className="grid grid-cols-2 gap-2 col-span-2">
                {SCHEDULE_DAYS.slice(5).map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={formData.days.includes(day) ? "default" : "outline"}
                    className={`h-12 text-sm font-medium ${
                      formData.days.includes(day) 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    }`}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center space-x-3">
              <Switch
                id="available"
                checked={formData.available}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, available: checked }))}
              />
              <Label htmlFor="available" className="text-sm font-medium">
                {formData.available ? 'Disponível' : 'Indisponível'}
              </Label>
            </div>
            <div className={`text-sm ${formData.available ? 'text-green-600' : 'text-red-600'}`}>
              {formData.available ? 'Disponível' : 'Indisponível'}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="clinic-gradient text-white">
              {isEdit ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
