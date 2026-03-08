import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer, User, Stethoscope, Calendar, Pill } from "lucide-react";
import { Prescription } from "@/types/prescription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { printHtmlDocument } from "@/lib/print";

interface ViewPrescriptionModalProps {
  prescription: Prescription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewPrescriptionModal({ prescription, open, onOpenChange }: ViewPrescriptionModalProps) {
  const { customizationData } = useCustomizationContext();
  
  if (!prescription) return null;

  const primaryColor = customizationData.primaryColor || '#3B82F6';
  const appName = customizationData.appName || 'Clínica Médica';
  const appSubtitle = customizationData.appSubtitle || '';
  const logoUrl = customizationData.logoUrl || '';

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receita Médica - ${prescription.patient_name}</title>
        <style>
          @page { 
            size: A4; 
            margin: 15mm 20mm;
          }
          
          * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
          }
          
          body { 
            font-family: 'Times New Roman', Times, serif; 
            color: #1a1a1a;
            line-height: 1.4;
            position: relative;
            min-height: 100vh;
          }
          
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.06;
            z-index: -1;
            pointer-events: none;
          }
          
          .watermark img {
            max-width: 400px;
            max-height: 400px;
            filter: grayscale(100%);
          }
          
          .prescription-container {
            max-width: 700px;
            margin: 0 auto;
            padding: 0 20px;
          }
          
          /* Header / Timbrado */
          .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 3px double ${primaryColor};
            margin-bottom: 25px;
          }
          
          .header-logo {
            margin-bottom: 8px;
          }
          
          .header-logo img {
            max-height: 60px;
            max-width: 200px;
          }
          
          .header-title {
            font-size: 22px;
            font-weight: bold;
            color: ${primaryColor};
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          
          .header-subtitle {
            font-size: 12px;
            color: #666;
            font-style: italic;
          }
          
          /* Prescription Title */
          .prescription-title {
            text-align: center;
            margin: 25px 0;
            padding: 12px 0;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
          }
          
          .prescription-title h1 {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 3px;
            color: #333;
            text-transform: uppercase;
          }
          
          .prescription-date {
            font-size: 11px;
            color: #666;
            margin-top: 5px;
          }
          
          /* Patient Info */
          .patient-section {
            margin-bottom: 25px;
            padding: 15px;
            background: #fafafa;
            border-left: 3px solid ${primaryColor};
          }
          
          .patient-row {
            display: flex;
            margin-bottom: 6px;
            font-size: 13px;
          }
          
          .patient-label {
            font-weight: bold;
            width: 100px;
            color: #444;
          }
          
          .patient-value {
            flex: 1;
            border-bottom: 1px dotted #ccc;
            padding-bottom: 2px;
          }
          
          /* Medications */
          .medications-section {
            margin-bottom: 25px;
          }
          
          .medications-header {
            font-size: 14px;
            font-weight: bold;
            color: ${primaryColor};
            border-bottom: 2px solid ${primaryColor};
            padding-bottom: 8px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .medications-header::before {
            content: "℞";
            font-size: 24px;
          }
          
          .medication-item {
            margin-bottom: 18px;
            padding-left: 20px;
            position: relative;
          }
          
          .medication-item::before {
            content: "";
            position: absolute;
            left: 0;
            top: 8px;
            width: 8px;
            height: 8px;
            background: ${primaryColor};
            border-radius: 50%;
          }
          
          .medication-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
            color: #222;
          }
          
          .medication-details {
            font-size: 12px;
            color: #555;
            padding-left: 10px;
            border-left: 2px solid #e0e0e0;
            margin-left: 5px;
          }
          
          .medication-details p {
            margin-bottom: 3px;
          }
          
          /* Notes */
          .notes-section {
            margin-top: 20px;
            padding: 12px;
            background: #f5f5f5;
            border: 1px dashed #ccc;
            font-size: 12px;
          }
          
          .notes-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #444;
          }
          
          /* Footer / Signature */
          .footer {
            margin-top: 50px;
            text-align: center;
          }
          
          .signature-area {
            display: inline-block;
            min-width: 280px;
          }
          
          .signature-line {
            border-top: 1px solid #333;
            margin-bottom: 8px;
            padding-top: 60px;
          }
          
          .signature-name {
            font-size: 14px;
            font-weight: bold;
            color: #333;
          }
          
          .signature-role {
            font-size: 11px;
            color: #666;
            margin-top: 3px;
          }
          
          /* Print Footer */
          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9px;
            color: #999;
            padding: 10px;
            border-top: 1px solid #eee;
          }
          
          @media print { 
            body { 
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .watermark {
              position: fixed;
            }
          }
        </style>
      </head>
      <body>
        ${logoUrl ? `
        <div class="watermark">
          <img src="${logoUrl}" alt="Logo" />
        </div>
        ` : ''}
        
        <div class="prescription-container">
          <div class="header">
            ${logoUrl ? `
            <div class="header-logo">
              <img src="${logoUrl}" alt="Logo" />
            </div>
            ` : ''}
            <div class="header-title">${appName}</div>
            ${appSubtitle ? `<div class="header-subtitle">${appSubtitle}</div>` : ''}
          </div>
          
          <div class="prescription-title">
            <h1>Receituário Médico</h1>
            <div class="prescription-date">
              ${format(new Date(prescription.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          </div>
          
          <div class="patient-section">
            <div class="patient-row">
              <span class="patient-label">Paciente:</span>
              <span class="patient-value">${prescription.patient_name}</span>
            </div>
            ${prescription.diagnosis ? `
            <div class="patient-row">
              <span class="patient-label">Diagnóstico:</span>
              <span class="patient-value">${prescription.diagnosis}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="medications-section">
            <div class="medications-header">Prescrição</div>
            ${prescription.medications.map((med, i) => `
              <div class="medication-item">
                <div class="medication-name">${i + 1}. ${med.name}</div>
                <div class="medication-details">
                  ${med.dosage ? `<p><strong>Dosagem:</strong> ${med.dosage}</p>` : ''}
                  ${med.frequency ? `<p><strong>Frequência:</strong> ${med.frequency}</p>` : ''}
                  ${med.duration ? `<p><strong>Duração:</strong> ${med.duration}</p>` : ''}
                  ${med.instructions ? `<p><strong>Instruções:</strong> ${med.instructions}</p>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          
          ${prescription.notes ? `
          <div class="notes-section">
            <div class="notes-title">Observações:</div>
            <div>${prescription.notes}</div>
          </div>
          ` : ''}
          
          <div class="footer">
            <div class="signature-area">
              <div class="signature-line"></div>
              <div class="signature-name">${prescription.attendant_name}</div>
              <div class="signature-role">Médico(a) Responsável</div>
            </div>
          </div>
        </div>
        
        <div class="print-footer">
          Documento gerado eletronicamente por ${appName}
        </div>
      </body>
      </html>
    `;

    printHtmlDocument({
      html: printContent,
      onPopupBlocked: () =>
        alert("Por favor, permita pop-ups para imprimir a receita."),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Receita Médica
          </DialogTitle>
          <DialogDescription>
            Visualização detalhada da receita médica do paciente {prescription.patient_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Patient and Attendant Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium">{prescription.patient_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Stethoscope className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Médico/Atendente</p>
                <p className="font-medium">{prescription.attendant_name}</p>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Emitida em {format(new Date(prescription.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          {/* Diagnosis */}
          {prescription.diagnosis && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Diagnóstico</p>
              <p>{prescription.diagnosis}</p>
            </div>
          )}

          <Separator />

          {/* Medications */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Medicamentos Prescritos
            </h3>
            
            {prescription.medications.map((med, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium">{med.name}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {med.dosage && (
                    <div>
                      <span className="text-muted-foreground">Dosagem: </span>
                      <span>{med.dosage}</span>
                    </div>
                  )}
                  {med.frequency && (
                    <div>
                      <span className="text-muted-foreground">Frequência: </span>
                      <span>{med.frequency}</span>
                    </div>
                  )}
                  {med.duration && (
                    <div>
                      <span className="text-muted-foreground">Duração: </span>
                      <span>{med.duration}</span>
                    </div>
                  )}
                </div>
                {med.instructions && (
                  <div className="text-sm bg-muted/50 p-2 rounded">
                    <span className="text-muted-foreground">Instruções: </span>
                    <span>{med.instructions}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          {prescription.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Observações</p>
                <p className="text-sm">{prescription.notes}</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
