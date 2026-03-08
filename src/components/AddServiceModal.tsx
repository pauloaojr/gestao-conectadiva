import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (service: { name: string; price: number; available: boolean; description?: string }) => void;
  initialData?: { name: string; price: number; available: boolean; description?: string };
  isEdit?: boolean;
}

export const AddServiceModal = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData,
  isEdit = false 
}: AddServiceModalProps) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [available, setAvailable] = useState(true);

  // Sincronizar estado com initialData quando o modal abre
  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name || '');
      setPrice(initialData.price || 0);
      setDescription(initialData.description || '');
      setAvailable(initialData.available ?? true);
    } else if (open && !isEdit) {
      // Reset para novo serviço
      setName('');
      setPrice(0);
      setDescription('');
      setAvailable(true);
    }
  }, [open, initialData, isEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    onSubmit({
      name: name.trim(),
      price: Number(price),
      description: description.trim() || undefined,
      available
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Serviço' : 'Adicionar Novo Serviço'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? 'Formulário para editar nome, preço e descrição do serviço.' : 'Formulário para cadastrar um novo serviço com nome, preço e descrição.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Serviço</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Consulta Geral"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do serviço"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="available"
              checked={available}
              onCheckedChange={setAvailable}
            />
            <Label htmlFor="available">Disponível</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
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
