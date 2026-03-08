import { useState } from "react";
import { MoreVertical, Calendar, FileText, Edit, Trash2, Printer, Pill, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Patient } from "@/hooks/usePatients";
import { printHtmlDocument } from "@/lib/print";

interface PatientActionsProps {
  patient: any; // UI patient for display
  fullPatient?: Patient; // Full Supabase patient for printing
  onEdit: (patient: any) => void;
  onView?: (patient: any) => void;
  onDelete: (patientId: string) => void;
  onViewRecord?: (patientId: string) => void;
  onViewPrescription?: (patientId: string) => void;
}

const PatientActions = ({ patient, fullPatient, onEdit, onView, onDelete, onViewRecord, onViewPrescription }: PatientActionsProps) => {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { customizationData } = useCustomizationContext();
  const { hasPermission } = useAuth();

  // Use fullPatient for printing if available, otherwise try to use patient directly
  const printPatient = fullPatient || patient;

  const handlePrescription = () => {
    if (onViewPrescription) {
      onViewPrescription(patient.id);
    } else {
      navigate('/receituario');
      toast({
        title: "Receituário",
        description: `Abrindo receituário para ${patient.name}`,
      });
    }
  };

  const handleSchedule = () => {
    navigate('/agenda');
    toast({
      title: "Agendar Consulta",
      description: `Redirecionando para agenda para ${patient.name}`,
    });
  };

  const handleViewRecord = () => {
    if (onViewRecord) {
      onViewRecord(patient.id);
    } else {
      navigate('/prontuarios');
      toast({
        title: "Prontuário",
        description: `Abrindo prontuário de ${patient.name}`,
      });
    }
  };

  const handleEdit = () => {
    onEdit(patient);
    toast({
      title: "Editar Paciente",
      description: `Editando informações de ${patient.name}`,
    });
  };

  const handleView = () => {
    if (onView) onView(patient);
  };

  const handleDelete = () => {
    onDelete(patient.id);
    setShowDeleteAlert(false);
    toast({
      title: "Paciente removido",
      description: `${patient.name} foi removido com sucesso.`,
    });
  };

  const handlePrint = () => {
    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'active': return 'Ativo';
        case 'inactive': return 'Inativo';
        case 'pending': return 'Pendente';
        default: return status;
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active': return '#059669';
        case 'inactive': return '#dc2626';
        case 'pending': return '#d97706';
        default: return '#6b7280';
      }
    };

    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'Não informado';
      try {
        return new Date(dateString).toLocaleDateString('pt-BR');
      } catch {
        return dateString;
      }
    };

    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ficha do Paciente - ${printPatient.name}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #1a1a1a;
            background: white;
          }
          
          .page-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
          }
          
          /* Header com logo e título */
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .header-logo {
            max-height: 50px;
            max-width: 120px;
          }
          
          .header-info {
            border-left: 2px solid #e5e7eb;
            padding-left: 15px;
          }
          
          .clinic-name {
            font-size: 18pt;
            font-weight: 700;
            color: #1e40af;
            letter-spacing: -0.5px;
          }
          
          .clinic-subtitle {
            font-size: 9pt;
            color: #64748b;
            margin-top: 2px;
          }
          
          .header-right {
            text-align: right;
          }
          
          .doc-title {
            font-size: 12pt;
            font-weight: 700;
            color: #1e40af;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .doc-date {
            font-size: 8pt;
            color: #64748b;
            margin-top: 4px;
          }
          
          /* Seção principal do paciente com foto */
          .patient-header {
            display: flex;
            gap: 25px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .patient-photo {
            flex-shrink: 0;
          }
          
          .photo-frame {
            width: 110px;
            height: 140px;
            border: 3px solid #1e40af;
            border-radius: 6px;
            overflow: hidden;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .photo-placeholder {
            color: #94a3b8;
            font-size: 9pt;
            text-align: center;
            padding: 10px;
          }
          
          .patient-main-info {
            flex: 1;
          }
          
          .patient-name {
            font-size: 20pt;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 8px;
          }
          
          .patient-quick-info {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 12px;
          }
          
          .quick-item {
            background: white;
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          
          .quick-label {
            font-size: 8pt;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          
          .quick-value {
            font-size: 11pt;
            font-weight: 600;
            color: #0f172a;
            margin-top: 3px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 9pt;
            font-weight: 600;
            color: white;
          }
          
          /* Grid de seções */
          .sections-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .section {
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            overflow: hidden;
          }
          
          .section-header {
            background: #1e40af;
            color: white;
            padding: 8px 15px;
            font-size: 10pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .section-content {
            padding: 15px;
          }
          
          .info-row {
            display: flex;
            padding: 6px 0;
            border-bottom: 1px dotted #e5e7eb;
          }
          
          .info-row:last-child {
            border-bottom: none;
          }
          
          .info-label {
            font-weight: 600;
            color: #374151;
            min-width: 110px;
            font-size: 10pt;
          }
          
          .info-value {
            color: #1f2937;
            font-size: 10pt;
          }
          
          /* Seção de endereço full width */
          .section-full {
            grid-column: 1 / -1;
          }
          
          .address-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          
          .address-item {
            padding: 8px 0;
          }
          
          /* Observações */
          .observations-section {
            margin-bottom: 20px;
          }
          
          .observations-box {
            min-height: 120px;
            border: 2px dashed #cbd5e1;
            border-radius: 6px;
            padding: 15px;
            background: #fafafa;
          }
          
          .observations-placeholder {
            color: #9ca3af;
            font-style: italic;
            font-size: 10pt;
          }
          
          .observations-content {
            color: #374151;
            font-size: 10pt;
            white-space: pre-wrap;
          }
          
          /* Assinaturas */
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
            padding-top: 20px;
          }
          
          .signature-box {
            text-align: center;
          }
          
          .signature-line {
            border-top: 1px solid #374151;
            margin-bottom: 8px;
            padding-top: 8px;
          }
          
          .signature-label {
            font-size: 9pt;
            color: #64748b;
          }
          
          /* Footer */
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
          }
          
          .footer-text {
            font-size: 8pt;
            color: #6b7280;
          }
          
          .footer-confidential {
            font-size: 7pt;
            color: #9ca3af;
            margin-top: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .page-container {
              padding: 0;
              max-width: none;
            }
            
            .section-header {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .patient-header {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              ${customizationData.logoUrl ? `<img src="${customizationData.logoUrl}" alt="Logo" class="header-logo" />` : ''}
              <div class="header-info">
                <div class="clinic-name">${customizationData.appName || 'Clínica Médica'}</div>
                <div class="clinic-subtitle">${customizationData.appSubtitle || 'Sistema de Gestão de Pacientes'}</div>
              </div>
            </div>
            <div class="header-right">
              <div class="doc-title">Ficha Cadastral</div>
              <div class="doc-date">Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
          
          <!-- Seção principal do paciente com foto -->
          <div class="patient-header">
            <div class="patient-photo">
              <div class="photo-frame">
                ${printPatient.photo_url ?
        `<img src="${printPatient.photo_url}" alt="Foto do paciente" />` :
        `<div class="photo-placeholder">📷<br/>Sem foto</div>`
      }
              </div>
            </div>
            <div class="patient-main-info">
              <div class="patient-name">${printPatient.name}</div>
              <div class="patient-quick-info">
                <div class="quick-item">
                  <div class="quick-label">CPF</div>
                  <div class="quick-value">${printPatient.cpf || 'Não informado'}</div>
                </div>
                <div class="quick-item">
                  <div class="quick-label">RG</div>
                  <div class="quick-value">${printPatient.rg || 'Não informado'}</div>
                </div>
                <div class="quick-item">
                  <div class="quick-label">Status</div>
                  <div class="quick-value">
                    <span class="status-badge" style="background-color: ${getStatusColor(printPatient.status)}">${getStatusLabel(printPatient.status)}</span>
                  </div>
                </div>
                <div class="quick-item">
                  <div class="quick-label">Data Nascimento</div>
                  <div class="quick-value">${formatDate(printPatient.birth_date)}</div>
                </div>
                <div class="quick-item">
                  <div class="quick-label">Telefone</div>
                  <div class="quick-value">${printPatient.phone || 'Não informado'}</div>
                </div>
                <div class="quick-item">
                  <div class="quick-label">E-mail</div>
                  <div class="quick-value">${printPatient.email || 'Não informado'}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Grid de seções -->
          <div class="sections-grid">
            <!-- Dados Pessoais -->
            <div class="section">
              <div class="section-header">Dados Pessoais</div>
              <div class="section-content">
                <div class="info-row">
                  <span class="info-label">Gênero:</span>
                  <span class="info-value">${printPatient.gender || 'Não informado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Profissão:</span>
                  <span class="info-value">${printPatient.profession || 'Não informado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Estado Civil:</span>
                  <span class="info-value">${printPatient.marital_status || 'Não informado'}</span>
                </div>
              </div>
            </div>
            
            <!-- Informações de Atendimento -->
            <div class="section">
              <div class="section-header">Informações do Cadastro</div>
              <div class="section-content">
                <div class="info-row">
                  <span class="info-label">Cadastrado em:</span>
                  <span class="info-value">${formatDate(printPatient.created_at)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Última Atualização:</span>
                  <span class="info-value">${formatDate(printPatient.updated_at)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Total Sessões:</span>
                  <span class="info-value">0</span>
                </div>
              </div>
            </div>
            
            <!-- Endereço -->
            <div class="section section-full">
              <div class="section-header">Endereço</div>
              <div class="section-content">
                <div class="address-grid">
                  <div class="address-item">
                    <div class="info-label">Logradouro</div>
                    <div class="info-value">${printPatient.address_street || 'Não informado'}${printPatient.address_number ? `, ${printPatient.address_number}` : ''}</div>
                  </div>
                  <div class="address-item">
                    <div class="info-label">Complemento</div>
                    <div class="info-value">${printPatient.address_complement || '-'}</div>
                  </div>
                  <div class="address-item">
                    <div class="info-label">Bairro</div>
                    <div class="info-value">${printPatient.address_neighborhood || 'Não informado'}</div>
                  </div>
                  <div class="address-item">
                    <div class="info-label">Cidade</div>
                    <div class="info-value">${printPatient.address_city || 'Não informado'}</div>
                  </div>
                  <div class="address-item">
                    <div class="info-label">Estado</div>
                    <div class="info-value">${printPatient.address_state || 'Não informado'}</div>
                  </div>
                  <div class="address-item">
                    <div class="info-label">CEP</div>
                    <div class="info-value">${printPatient.address_cep || 'Não informado'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Observações Clínicas -->
          <div class="observations-section">
            <div class="section">
              <div class="section-header">Observações / Anotações</div>
              <div class="section-content">
                <div class="observations-box">
                  ${printPatient.notes ?
        `<div class="observations-content">${printPatient.notes}</div>` :
        `<div class="observations-placeholder">Espaço reservado para anotações clínicas e observações relevantes sobre o paciente.</div>`
      }
                </div>
              </div>
            </div>
          </div>
          
          <!-- Assinaturas -->
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Assinatura do Responsável</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Assinatura do Profissional</div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-text">
              Documento gerado automaticamente pelo sistema ${customizationData.appName || 'de gestão da clínica'}.
            </div>
            <div class="footer-confidential">
              Documento confidencial • Uso exclusivo para fins médicos
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const opened = printHtmlDocument({
      html: printContent,
      printDelayMs: 300,
      onPopupBlocked: () =>
        toast({
          title: "Impressão bloqueada",
          description: "Permita pop-ups no navegador para imprimir a ficha.",
          variant: "destructive",
        }),
    });

    if (!opened) return;

    toast({
      title: "Documento preparado",
      description: `Ficha de ${printPatient.name} pronta para impressão`,
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10 rounded-lg">
            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50">
          <DropdownMenuItem onClick={handlePrint} className="font-medium cursor-pointer">
            <Printer className="mr-2 h-4 w-4 text-primary" />
            Imprimir Ficha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleView} className="font-medium cursor-pointer">
            <Eye className="mr-2 h-4 w-4 text-blue-500" />
            Visualizar Paciente
          </DropdownMenuItem>
          {hasPermission('patients', 'edit') && (
            <DropdownMenuItem onClick={handleEdit} className="font-medium cursor-pointer">
              <Edit className="mr-2 h-4 w-4 text-amber-500" />
              Editar Paciente
            </DropdownMenuItem>
          )}
          {(hasPermission('patients', 'edit') || hasPermission('patients', 'delete')) && (
            <DropdownMenuSeparator className="bg-border/50" />
          )}
          {hasPermission('patients', 'delete') && (
            <DropdownMenuItem
              onClick={() => setShowDeleteAlert(true)}
              className="text-rose-500 hover:text-rose-600 focus:text-rose-600 font-bold cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Registro
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o paciente
              <strong> {patient.name}</strong> e todos os dados relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PatientActions;
