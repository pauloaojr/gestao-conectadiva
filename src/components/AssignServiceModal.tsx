
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ServiceAssignment } from '@/types/service';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';
import { Badge } from '@/components/ui/badge';
import { User, CheckCircle, Loader2 } from 'lucide-react';

interface AssignServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (attendants: Array<{ id: string; name: string }>) => void;
  service?: { name: string; price: number };
  existingAssignments: ServiceAssignment[];
}

export const AssignServiceModal = ({
  open,
  onOpenChange,
  onSubmit,
  service,
  existingAssignments
}: AssignServiceModalProps) => {
  const [selectedAttendants, setSelectedAttendants] = useState<string[]>([]);
  const { users, isLoading } = useSupabaseUsers();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedAttendants.length === 0) return;

    // Usar user_id (referência ao auth.users) ao invés de id (da tabela profiles)
    const attendants = selectedAttendants.map(id => {
      const user = users.find(u => u.id === id);
      // Retornar user_id para atender a FK que referencia auth.users
      return { id: user?.user_id || id, name: user?.name || '' };
    }).filter(attendant => attendant.name);

    onSubmit(attendants);
    setSelectedAttendants([]);
    onOpenChange(false);
  };

  const toggleAttendant = (attendantId: string) => {
    setSelectedAttendants(prev =>
      prev.includes(attendantId)
        ? prev.filter(id => id !== attendantId)
        : [...prev, attendantId]
    );
  };

  const isAttendantAlreadyAssigned = (attendantId: string) => {
    if (!service) return false;

    const assignment = existingAssignments.find(a => a.attendantId === attendantId);
    if (!assignment) return false;

    return assignment.services.some(s => s.name === service.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atribuir Serviço</DialogTitle>
          <DialogDescription className="sr-only">
            Selecione os atendentes para atribuir a este serviço.
          </DialogDescription>
          {service && (
            <p className="text-sm text-gray-600">
              Serviço: {service.name} - R$ {service.price.toFixed(2)}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Selecionar Atendentes ({selectedAttendants.length} selecionado{selectedAttendants.length !== 1 ? 's' : ''})
            </Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : users.filter(user => user.is_active && user.role === 'user').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum atendente disponível
              </div>
            ) : (
              <div className="grid gap-2">
                {users.filter(user => user.is_active && user.role === 'user').map((user) => {
                  const isAlreadyAssigned = isAttendantAlreadyAssigned(user.id);
                  const isSelected = selectedAttendants.includes(user.id);

                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={isAlreadyAssigned}
                      onClick={() => toggleAttendant(user.id)}
                      className={`
                        flex items-center justify-between p-4 border rounded-lg transition-all
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : isAlreadyAssigned
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          ${isSelected
                            ? 'bg-blue-100'
                            : isAlreadyAssigned
                              ? 'bg-gray-100'
                              : 'bg-gray-200'
                          }
                        `}>
                          <User className={`
                            w-5 h-5
                            ${isSelected
                              ? 'text-blue-600'
                              : isAlreadyAssigned
                                ? 'text-gray-400'
                                : 'text-gray-600'
                            }
                          `} />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{user.name}</div>
                          <div className={`text-sm ${isAlreadyAssigned ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.position || 'Atendente'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAlreadyAssigned && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                            Já atribuído
                          </Badge>
                        )}
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="clinic-gradient text-white"
              disabled={selectedAttendants.length === 0}
            >
              Atribuir a {selectedAttendants.length} atendente{selectedAttendants.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
