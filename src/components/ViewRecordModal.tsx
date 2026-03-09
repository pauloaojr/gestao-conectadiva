import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Activity, FileText, Clock, Printer, Building2, Hash, Stethoscope, Trash2, X } from "lucide-react";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { printHtmlDocument } from "@/lib/print";

interface MedicalRecord {
  id: string;
  patientName: string;
  patientId: string;
  lastUpdate: string;
  diagnosis: string;
  sessions: number;
  status: string;
  notes: string;
  nextAppointment: string;
}

interface ViewRecordModalProps {
  record: MedicalRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: (recordId: string) => void;
}

export const ViewRecordModal = ({ record, isOpen, onClose, onEdit, onDelete }: ViewRecordModalProps) => {
  const { customizationData } = useCustomizationContext();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!record) return null;

  const handleDelete = () => {
    if (onDelete) {
      onDelete(record.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handlePrint = () => {
    const primaryColor = customizationData.primaryColor || '#0066CC';
    const clinicName = customizationData.appName || 'Clínica Médica';
    const clinicSubtitle = customizationData.appSubtitle || 'Prontuário Médico';
    const logoUrl = customizationData.logoUrl;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prontuário - ${record.patientName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
              color: #1a1a2e;
              line-height: 1.6;
              background: #fff;
              padding: 0;
            }
            
            .document {
              max-width: 210mm;
              margin: 0 auto;
              padding: 40px;
            }
            
            .header { 
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-bottom: 24px;
              border-bottom: 3px solid ${primaryColor};
              margin-bottom: 32px;
            }
            
            .header-left {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            
            .logo {
              width: 64px;
              height: 64px;
              object-fit: contain;
              border-radius: 8px;
            }
            
            .logo-placeholder {
              width: 64px;
              height: 64px;
              background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 28px;
              font-weight: 700;
            }
            
            .clinic-info {
              display: flex;
              flex-direction: column;
            }
            
            .clinic-name { 
              font-size: 22px; 
              font-weight: 700; 
              color: #1a1a2e;
              letter-spacing: -0.5px;
            }
            
            .clinic-subtitle { 
              font-size: 13px; 
              color: #64748b;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .header-right {
              text-align: right;
            }
            
            .doc-type {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
            }
            
            .doc-date {
              font-size: 12px;
              color: #94a3b8;
              margin-top: 4px;
            }
            
            .patient-header {
              background: linear-gradient(135deg, ${primaryColor}10, ${primaryColor}05);
              border: 1px solid ${primaryColor}20;
              border-radius: 12px;
              padding: 24px;
              margin-bottom: 28px;
            }
            
            .patient-header-title {
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 11px;
              font-weight: 600;
              color: ${primaryColor};
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 16px;
            }
            
            .patient-header-title svg {
              width: 16px;
              height: 16px;
            }
            
            .patient-name {
              font-size: 26px;
              font-weight: 700;
              color: #1a1a2e;
              margin-bottom: 8px;
            }
            
            .patient-meta {
              display: flex;
              gap: 24px;
              flex-wrap: wrap;
            }
            
            .patient-meta-item {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              color: #64748b;
            }
            
            .patient-meta-item svg {
              width: 14px;
              height: 14px;
              color: #94a3b8;
            }
            
            .status-badge {
              display: inline-flex;
              align-items: center;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            
            .status-em-tratamento { background: #dbeafe; color: #1d4ed8; }
            .status-iniciando { background: #dcfce7; color: #16a34a; }
            .status-concluido { background: #f1f5f9; color: #475569; }
            .status-pausado { background: #fef3c7; color: #d97706; }
            
            .content-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin-bottom: 24px;
            }
            
            .section {
              background: #fafbfc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 20px;
            }
            
            .section-full {
              grid-column: 1 / -1;
            }
            
            .section-title {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              margin-bottom: 12px;
              padding-bottom: 10px;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .section-title svg {
              width: 14px;
              height: 14px;
              color: ${primaryColor};
            }
            
            .section-content {
              font-size: 14px;
              color: #1a1a2e;
              line-height: 1.7;
            }
            
            .section-content.highlight {
              font-size: 15px;
              font-weight: 500;
              color: #1a1a2e;
              background: ${primaryColor}08;
              padding: 12px 16px;
              border-left: 3px solid ${primaryColor};
              border-radius: 0 6px 6px 0;
            }
            
            .section-content.empty {
              color: #94a3b8;
              font-style: italic;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px dashed #e2e8f0;
            }
            
            .info-row:last-child {
              border-bottom: none;
            }
            
            .info-label {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
            }
            
            .info-value {
              font-size: 13px;
              color: #1a1a2e;
              font-weight: 600;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .footer-left {
              font-size: 11px;
              color: #94a3b8;
            }
            
            .footer-right {
              text-align: right;
            }
            
            .footer-signature {
              border-top: 1px solid #cbd5e1;
              padding-top: 8px;
              width: 200px;
            }
            
            .footer-signature-text {
              font-size: 11px;
              color: #94a3b8;
              text-align: center;
            }
            
            @media print {
              body { 
                margin: 0; 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .document {
                padding: 20px;
              }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="document">
            <div class="header">
              <div class="header-left">
                ${logoUrl
        ? `<img src="${logoUrl}" alt="Logo" class="logo" />`
        : `<div class="logo-placeholder">${clinicName.charAt(0)}</div>`
      }
                <div class="clinic-info">
                  <div class="clinic-name">${clinicName}</div>
                  <div class="clinic-subtitle">${clinicSubtitle}</div>
                </div>
              </div>
              <div class="header-right">
                <div class="doc-type">Prontuário Médico</div>
                <div class="doc-date">${new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })}</div>
              </div>
            </div>
            
            <div class="patient-header">
              <div class="patient-header-title">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Dados do Paciente
              </div>
              <div class="patient-name">${record.patientName}</div>
              <div class="patient-meta">
                <div class="patient-meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
                  ID: ${record.patientId.slice(0, 8).toUpperCase()}
                </div>
                <div class="patient-meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  ${record.sessions} ${record.sessions === 1 ? 'sessão' : 'sessões'}
                </div>
                <span class="status-badge status-${record.status.toLowerCase().replace(/\s+/g, '-')}">${record.status}</span>
              </div>
            </div>
            
            <div class="content-grid">
              <div class="section section-full">
                <div class="section-title">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
                  Diagnóstico Principal
                </div>
                <div class="section-content highlight">
                  ${record.diagnosis}
                </div>
              </div>
              
              <div class="section section-full">
                <div class="section-title">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                  Observações Clínicas
                </div>
                <div class="section-content ${!record.notes ? 'empty' : ''}">
                  ${record.notes || 'Nenhuma observação registrada neste prontuário.'}
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Última Atualização
                </div>
                <div class="info-row">
                  <span class="info-label">Data</span>
                  <span class="info-value">${record.lastUpdate}</span>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  Próxima Consulta
                </div>
                <div class="info-row">
                  <span class="info-label">Agendamento</span>
                  <span class="info-value">${record.nextAppointment !== "A definir" ? record.nextAppointment : "Não agendada"}</span>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-left">
                <div>Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div style="margin-top: 4px;">ID do Prontuário: ${record.id.slice(0, 12).toUpperCase()}</div>
              </div>
              <div class="footer-right">
                <div class="footer-signature">
                  <div class="footer-signature-text">Assinatura do Responsável</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printHtmlDocument({
      html: printContent,
      onPopupBlocked: () =>
        alert("Por favor, permita pop-ups para imprimir o prontuário."),
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Em Tratamento':
        return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' };
      case 'Iniciando':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' };
      case 'Concluído':
        return { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' };
      case 'Pausado':
        return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' };
      default:
        return { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' };
    }
  };

  const statusConfig = getStatusConfig(record.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Prontuário de {record.patientName}</DialogTitle>
        <DialogDescription className="sr-only">Visualização e edição do prontuário médico do paciente {record.patientName}</DialogDescription>
        {/* Header com gradiente dinâmico */}
        <div className="p-6 text-white relative overflow-hidden" style={{ backgroundColor: customizationData.primaryColor }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 group"
          >
            <X className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>
          <div className="absolute inset-0 bg-gradient-to-br from-black/0 to-black/20 pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-4">
              {customizationData.logoUrl ? (
                <div className="p-1 bg-white/20 backdrop-blur-md rounded-xl">
                  <img
                    src={customizationData.logoUrl}
                    alt="Logo"
                    className="w-12 h-12 object-contain"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold tracking-tight">{customizationData.appName}</h2>
                <p className="text-white/80 text-xs font-medium uppercase tracking-wider">{customizationData.appSubtitle}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1 pr-10">
              <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-black">Prontuário Médico</div>
              <div className="text-xs text-white/90 font-mono bg-black/10 px-2 py-0.5 rounded">
                # {record.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Card do Paciente */}
          <div className="bg-muted/40 rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
              <User className="w-3 h-3" style={{ color: customizationData.primaryColor }} />
              DADOS DO PACIENTE
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-foreground tracking-tight">{record.patientName}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded">
                    <span className="opacity-60">ID:</span>
                    <span className="font-mono">{record.patientId.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded">
                    <Activity className="w-3 h-3" style={{ color: customizationData.primaryColor }} />
                    <span>{record.sessions} {record.sessions === 1 ? 'sessão realizada' : 'sessões realizadas'}</span>
                  </div>
                </div>
              </div>
              <Badge className={`${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} shadow-none rounded-lg px-3 py-1 text-[11px] font-bold uppercase tracking-wider`}>
                {record.status}
              </Badge>
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Stethoscope className="w-4 h-4 text-primary" />
              Diagnóstico Principal
            </div>
            <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-4">
              <p className="text-foreground font-medium text-[15px] leading-relaxed">{record.diagnosis}</p>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              <FileText className="w-3 h-3" style={{ color: customizationData.primaryColor }} />
              OBSERVAÇÕES CLÍNICAS
            </div>
            <div className="bg-muted/20 rounded-xl p-4 border border-border/50 min-h-[100px]">
              <p className={`text-sm leading-relaxed ${record.notes ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
                {record.notes || 'Nenhuma observação registrada neste prontuário.'}
              </p>
            </div>
          </div>

          {/* Acompanhamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50 transition-colors hover:bg-muted/40">
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">
                <Clock className="w-3 h-3" style={{ color: customizationData.primaryColor }} />
                ATUALIZAÇÃO
              </div>
              <p className="text-foreground font-black tracking-tight">{record.lastUpdate}</p>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 border border-border/50 transition-colors hover:bg-muted/40">
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">
                <Calendar className="w-3 h-3" style={{ color: customizationData.primaryColor }} />
                PRÓXIMO AGENDAMENTO
              </div>
              <p className={`font-black tracking-tight ${record.nextAppointment !== "A definir" ? 'text-foreground' : 'text-muted-foreground'}`}>
                {record.nextAppointment !== "A definir" ? record.nextAppointment : "NÃO AGENDADO"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer com ações */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-9 px-4 text-[11px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover Registro
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 px-4 text-[11px] font-black uppercase tracking-widest hover:bg-foreground/5 transition-colors">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-9 px-4 text-[11px] font-black uppercase tracking-widest hover:bg-foreground/5 transition-colors">
              Fechar
            </Button>
            <Button onClick={onEdit} size="sm" className="h-9 px-6 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: customizationData.primaryColor }}>
              <FileText className="w-4 h-4 mr-2" />
              Editar Prontuário
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o prontuário de <strong>{record.patientName}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
