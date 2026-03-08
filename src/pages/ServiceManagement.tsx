import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, DollarSign, Users, UserCheck, Briefcase, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useSupabaseServices, Service } from '@/hooks/useSupabaseServices';
import { AddServiceModal } from '@/components/AddServiceModal';
import { AssignServiceModal } from '@/components/AssignServiceModal';
import { useToast } from '@/hooks/use-toast';
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

const ServiceManagement = () => {
  const { 
    services, 
    serviceAssignments, 
    isLoading,
    addService, 
    deleteService, 
    assignService, 
    removeServiceAssignment, 
    updateService 
  } = useSupabaseServices();
  const { toast } = useToast();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<{
    id: string;
    serviceName: string;
    attendantName: string;
  } | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [isRemovingAssignment, setIsRemovingAssignment] = useState(false);

  const [sortBy, setSortBy] = useState<'name' | 'price' | 'status' | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleAssignService = (service: Service) => {
    setSelectedService(service);
    setAssignModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setEditModalOpen(true);
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      setIsDeletingService(true);
      await deleteService(serviceToDelete.id);
      toast({
        title: 'Serviço excluído',
        description: `O serviço ${serviceToDelete.name} foi removido com sucesso.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao excluir serviço',
        description: 'Não foi possível excluir o serviço. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingService(false);
      setServiceToDelete(null);
    }
  };

  const handleConfirmRemoveAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      setIsRemovingAssignment(true);
      await removeServiceAssignment(assignmentToDelete.id);
      toast({
        title: 'Serviço removido do profissional',
        description: `O serviço ${assignmentToDelete.serviceName} foi removido de ${assignmentToDelete.attendantName}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao remover serviço',
        description: 'Não foi possível remover o serviço atribuído. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingAssignment(false);
      setAssignmentToDelete(null);
    }
  };

  const handleAssignment = async (attendants: Array<{ id: string; name: string }>) => {
    if (selectedService) {
      for (const attendant of attendants) {
        await assignService(selectedService.id, attendant.id, attendant.name);
      }
      
      toast({
        title: "Serviços atribuídos",
        description: `Serviço ${selectedService.name} foi atribuído com sucesso.`,
      });
    }
  };

  const handleAddSubmit = async (data: { name: string; price: number; available: boolean; description?: string }) => {
    await addService({
      name: data.name,
      price: data.price,
      is_available: data.available,
      description: data.description || null,
      duration_minutes: 60
    });
  };

  const handleEditSubmit = async (data: { name: string; price: number; available: boolean; description?: string }) => {
    if (selectedService) {
      await updateService(selectedService.id, {
        name: data.name,
        price: data.price,
        is_available: data.available,
        description: data.description || null
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const sortedServices = useMemo(() => {
    if (!sortBy) return services;
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...services].sort((a, b) => {
      let aVal: string | number | boolean;
      let bVal: string | number | boolean;

      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
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
  }, [services, sortBy, sortOrder]);

  const handleColumnSort = (column: 'name' | 'price' | 'status') => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((old) => (old === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder(column === 'price' ? 'desc' : 'asc');
      return column;
    });
  };

  // Group assignments by attendant
  const groupedAssignments = serviceAssignments.reduce((acc, assignment) => {
    const existing = acc.find(a => a.attendant_id === assignment.attendant_id);
    const service = services.find(s => s.id === assignment.service_id);
    
    if (existing && service) {
      existing.services.push({
        assignmentId: assignment.id,
        ...service
      });
    } else if (service) {
      acc.push({
        attendant_id: assignment.attendant_id,
        attendant_name: assignment.attendant_name,
        services: [{
          assignmentId: assignment.id,
          ...service
        }]
      });
    }
    return acc;
  }, [] as Array<{ attendant_id: string; attendant_name: string; services: Array<Service & { assignmentId: string }> }>);

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
        <h1 className="text-3xl font-bold text-foreground">Serviços</h1>
        <Button 
          onClick={() => setAddModalOpen(true)}
          className="clinic-gradient text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Serviço
        </Button>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Gerenciar Serviços
          </TabsTrigger>
          <TabsTrigger value="assign" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Atribuir Serviços
          </TabsTrigger>
          <TabsTrigger value="assigned" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Serviços Atribuídos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Serviços Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum serviço disponível</p>
                  <Button 
                    onClick={() => setAddModalOpen(true)}
                    className="mt-4 clinic-gradient text-white"
                  >
                    Adicionar Primeiro Serviço
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
                          onClick={() => handleColumnSort('name')}
                        >
                          Nome do Serviço
                          {sortBy === 'name' ? (
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
                          onClick={() => handleColumnSort('price')}
                        >
                          Preço
                          {sortBy === 'price' ? (
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
                    {sortedServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{service.name}</div>
                            {service.description && (
                              <div className="text-sm text-muted-foreground">{service.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {formatPrice(service.price)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={service.is_available ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
                            {service.is_available ? 'Disponível' : 'Indisponível'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditService(service)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setServiceToDelete(service)}
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
                Atribuir Serviços
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione um serviço disponível para atribuir a um ou mais profissionais
              </p>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum serviço disponível para atribuição</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {sortedServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatPrice(service.price)}
                            {service.description && ` • ${service.description}`}
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleAssignService(service)}
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
                <p className="text-muted-foreground">Nenhum serviço atribuído ainda</p>
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
                    {assignment.services.map((service) => (
                      <div key={service.assignmentId} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm text-muted-foreground">Serviço</div>
                          <div className="text-sm font-medium">
                            {service.name}
                          </div>
                          {service.description && (
                            <div className="text-xs text-muted-foreground">{service.description}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <div className="text-sm text-muted-foreground">Preço</div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-sm font-medium">{formatPrice(service.price)}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setAssignmentToDelete({
                              id: service.assignmentId,
                              serviceName: service.name,
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

      <AddServiceModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddSubmit}
      />

      <AddServiceModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSubmit={handleEditSubmit}
        initialData={selectedService ? { 
          name: selectedService.name, 
          price: selectedService.price, 
          available: selectedService.is_available,
          description: selectedService.description || undefined
        } : undefined}
        isEdit={true}
      />

      <AssignServiceModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        onSubmit={handleAssignment}
        service={selectedService ? { name: selectedService.name, price: selectedService.price } : undefined}
        existingAssignments={groupedAssignments.map(a => ({
          id: a.attendant_id,
          attendantId: a.attendant_id,
          attendantName: a.attendant_name,
          services: a.services.map(s => ({
            id: s.id,
            name: s.name,
            price: s.price,
            status: 'available' as const,
            available: s.is_available
          }))
        }))}
      />

      <AlertDialog
        open={!!serviceToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingService) {
            setServiceToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              {serviceToDelete
                ? `Tem certeza que deseja excluir o serviço "${serviceToDelete.name}"? Esta ação é irreversível e também pode afetar atribuições existentes.`
                : 'Tem certeza que deseja excluir este serviço? Esta ação é irreversível e também pode afetar atribuições existentes.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingService}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteService}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeletingService}
            >
              {isDeletingService ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir serviço'
              )}
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
            <AlertDialogTitle>Remover serviço atribuído?</AlertDialogTitle>
            <AlertDialogDescription>
              {assignmentToDelete
                ? `Tem certeza que deseja remover o serviço "${assignmentToDelete.serviceName}" de ${assignmentToDelete.attendantName}? O profissional deixará de oferecer este serviço.`
                : 'Tem certeza que deseja remover este serviço do profissional?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingAssignment}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveAssignment}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isRemovingAssignment}
            >
              {isRemovingAssignment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover serviço'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServiceManagement;
