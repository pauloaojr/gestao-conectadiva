import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Clock, Users, UserCheck, Calendar, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useSupabaseSchedule } from '@/hooks/useSupabaseSchedule';
import { AddTimeSlotModal } from '@/components/AddTimeSlotModal';
import { AssignTimeSlotModal } from '@/components/AssignTimeSlotModal';
import { useToast } from '@/hooks/use-toast';

interface TimeSlotDisplay {
  id: string;
  time: string;
  days: string[];
  is_available: boolean;
}

const ScheduleManagement = () => {
  const { 
    timeSlots, 
    assignments, 
    isLoading,
    addTimeSlot, 
    deleteTimeSlot, 
    assignTimeSlot, 
    removeAssignment, 
    updateTimeSlot 
  } = useSupabaseSchedule();
  const { toast } = useToast();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotDisplay | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<TimeSlotDisplay | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<{
    id: string;
    time: string;
    days: string[];
    attendantName: string;
  } | null>(null);
  const [isDeletingSlot, setIsDeletingSlot] = useState(false);
  const [isRemovingAssignment, setIsRemovingAssignment] = useState(false);

  const [sortBy, setSortBy] = useState<'time' | 'days' | 'status' | null>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleAssignSlot = (slot: TimeSlotDisplay) => {
    setSelectedSlot(slot);
    setAssignModalOpen(true);
  };

  const handleEditSlot = (slot: TimeSlotDisplay) => {
    setSelectedSlot(slot);
    setEditModalOpen(true);
  };

  const handleAssignment = async (attendants: Array<{ id: string; name: string }>) => {
    if (selectedSlot) {
      for (const attendant of attendants) {
        await assignTimeSlot(selectedSlot.id, attendant.id, attendant.name);
      }
      
      toast({
        title: "Horários atribuídos",
        description: `Horário ${selectedSlot.time} foi atribuído com sucesso.`,
      });
    }
  };

  const handleAddSubmit = async (data: { time: string; days: string[]; available: boolean }) => {
    await addTimeSlot({
      time: data.time,
      days: data.days,
      is_available: data.available
    });
  };

  const handleEditSubmit = async (data: { time: string; days: string[]; available: boolean }) => {
    if (selectedSlot) {
      await updateTimeSlot(selectedSlot.id, {
        time: data.time,
        days: data.days,
        is_available: data.available
      });
    }
  };

  const handleConfirmDeleteSlot = async () => {
    if (!slotToDelete) return;
    try {
      setIsDeletingSlot(true);
      await deleteTimeSlot(slotToDelete.id);
      toast({
        title: 'Horário excluído',
        description: `O horário ${slotToDelete.time} foi removido com sucesso, junto com suas atribuições.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao excluir horário',
        description: 'Não foi possível excluir o horário. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingSlot(false);
      setSlotToDelete(null);
    }
  };

  const handleConfirmRemoveAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      setIsRemovingAssignment(true);
      await removeAssignment(assignmentToDelete.id);
      toast({
        title: 'Horário removido do atendente',
        description: `O horário ${assignmentToDelete.time} (${formatDayRange(assignmentToDelete.days)}) foi removido de ${assignmentToDelete.attendantName}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao remover horário',
        description: 'Não foi possível remover o horário atribuído. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingAssignment(false);
      setAssignmentToDelete(null);
    }
  };

  const formatDayRange = (days: string[]) => {
    const dayOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const sortedDays = [...days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    if (sortedDays.length === 7) {
      return 'Segunda a Domingo';
    }
    
    if (sortedDays.length === 1) {
      return sortedDays[0];
    }
    
    const groups: string[][] = [];
    let currentGroup = [sortedDays[0]];
    
    for (let i = 1; i < sortedDays.length; i++) {
      const currentIndex = dayOrder.indexOf(sortedDays[i]);
      const prevIndex = dayOrder.indexOf(sortedDays[i - 1]);
      
      if (currentIndex === prevIndex + 1) {
        currentGroup.push(sortedDays[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [sortedDays[i]];
      }
    }
    groups.push(currentGroup);
    
    return groups.map(group => {
      if (group.length === 1) {
        return group[0];
      } else {
        return `${group[0]} a ${group[group.length - 1]}`;
      }
    }).join(', ');
  };

  const sortedTimeSlots = useMemo(() => {
    if (!sortBy) return timeSlots;
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...timeSlots].sort((a, b) => {
      let aVal: string | boolean;
      let bVal: string | boolean;

      switch (sortBy) {
        case 'time':
          aVal = a.time;
          bVal = b.time;
          break;
        case 'days':
          aVal = formatDayRange(a.days).toLowerCase();
          bVal = formatDayRange(b.days).toLowerCase();
          break;
        case 'status':
          aVal = a.is_available;
          bVal = b.is_available;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  }, [timeSlots, sortBy, sortOrder]);

  const handleColumnSort = (column: 'time' | 'days' | 'status') => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((old) => (old === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('asc');
      return column;
    });
  };

  // Transform assignments to group by attendant
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const existing = acc.find(a => a.attendant_id === assignment.attendant_id);
    const slot = timeSlots.find(s => s.id === assignment.time_slot_id);
    
    if (existing && slot) {
      existing.timeSlots.push({
        assignmentId: assignment.id,
        ...slot
      });
    } else if (slot) {
      acc.push({
        attendant_id: assignment.attendant_id,
        attendant_name: assignment.attendant_name,
        timeSlots: [{
          assignmentId: assignment.id,
          ...slot
        }]
      });
    }
    return acc;
  }, [] as Array<{ attendant_id: string; attendant_name: string; timeSlots: Array<{ assignmentId: string; id: string; time: string; days: string[]; is_available: boolean }> }>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Horários</h1>
        <Button 
          onClick={() => setAddModalOpen(true)}
          className="clinic-gradient text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Horário
        </Button>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Horários Disponíveis
          </TabsTrigger>
          <TabsTrigger value="assign" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Atribuir Horários
          </TabsTrigger>
          <TabsTrigger value="assigned" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Horários Atribuídos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Horários Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum horário disponível</p>
                  <Button 
                    onClick={() => setAddModalOpen(true)}
                    className="mt-4 clinic-gradient text-white"
                  >
                    Adicionar Primeiro Horário
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => handleColumnSort('time')}
                        >
                          Horário
                          {sortBy === 'time' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ArrowDown className="ml-1 h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => handleColumnSort('days')}
                        >
                          Dias
                          {sortBy === 'days' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ArrowDown className="ml-1 h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => handleColumnSort('status')}
                        >
                          Status
                          {sortBy === 'status' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ArrowDown className="ml-1 h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTimeSlots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell className="font-medium">{slot.time}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDayRange(slot.days)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={slot.is_available ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
                            {slot.is_available ? 'Disponível' : 'Indisponível'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSlot({ ...slot, is_available: slot.is_available })}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSlotToDelete({ ...slot, is_available: slot.is_available })}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Atribuir Horários
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione um horário disponível para atribuir a um ou mais atendentes
              </p>
            </CardHeader>
            <CardContent>
              {timeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum horário disponível para atribuição</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {sortedTimeSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium">{slot.time}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDayRange(slot.days)}
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleAssignSlot({ ...slot, is_available: slot.is_available })}
                        className="clinic-gradient text-white"
                      >
                        Atribuir
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned" className="space-y-4">
          {groupedAssignments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum horário atribuído ainda</p>
              </CardContent>
            </Card>
          ) : (
            groupedAssignments.map((assignment) => (
              <Card key={assignment.attendant_id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    {assignment.attendant_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {assignment.timeSlots.map((slot) => (
                      <div key={slot.assignmentId} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm text-muted-foreground">Dia</div>
                          <div className="text-sm font-medium">
                            {formatDayRange(slot.days)}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <div className="text-sm text-muted-foreground">Horário</div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">{slot.time}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setAssignmentToDelete({
                              id: slot.assignmentId,
                              time: slot.time,
                              days: slot.days,
                              attendantName: assignment.attendant_name,
                            })
                          }
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <AddTimeSlotModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddSubmit}
      />

      <AddTimeSlotModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSubmit={handleEditSubmit}
        initialData={selectedSlot ? { time: selectedSlot.time, days: selectedSlot.days, available: selectedSlot.is_available } : undefined}
        isEdit={true}
      />

      <AssignTimeSlotModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        onSubmit={handleAssignment}
        timeSlot={selectedSlot ? { time: selectedSlot.time, days: selectedSlot.days } : undefined}
        existingAssignments={groupedAssignments.map(a => ({
          attendantId: a.attendant_id,
          timeSlots: a.timeSlots.map(s => ({ time: s.time, days: s.days }))
        }))}
      />

      <AlertDialog
        open={!!slotToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingSlot) {
            setSlotToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir horário?</AlertDialogTitle>
            <AlertDialogDescription>
              {slotToDelete && (
                <>
                  Tem certeza que deseja excluir o horário <strong>{slotToDelete.time}</strong> ({formatDayRange(slotToDelete.days)})?
                  As atribuições deste horário aos atendentes também serão removidas.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSlot}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSlot}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingSlot}
            >
              {isDeletingSlot ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!assignmentToDelete}
        onOpenChange={(open) => {
          if (!open && !isRemovingAssignment) {
            setAssignmentToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover horário do atendente?</AlertDialogTitle>
            <AlertDialogDescription>
              {assignmentToDelete
                ? `Tem certeza que deseja remover o horário ${assignmentToDelete.time} (${formatDayRange(
                    assignmentToDelete.days,
                  )}) de ${assignmentToDelete.attendantName}?`
                : 'Tem certeza que deseja remover este horário do atendente?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingAssignment}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveAssignment}
              className="bg-red-600 hover:bg-red-700"
              disabled={isRemovingAssignment}
            >
              {isRemovingAssignment ? 'Removendo...' : 'Remover horário'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScheduleManagement;
