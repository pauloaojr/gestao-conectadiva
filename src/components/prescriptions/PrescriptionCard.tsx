import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, MoreVertical, Printer, Trash2, User, Stethoscope, Pill } from "lucide-react";
import { Prescription } from "@/types/prescription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { printHtmlDocument } from "@/lib/print";

interface PrescriptionCardProps {
  prescription: Prescription;
  onView: () => void;
  onDelete: () => void;
}

export function PrescriptionCard({ prescription, onView, onDelete }: PrescriptionCardProps) {
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receita Médica - ${prescription.patient_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .info-section { margin-bottom: 20px; }
          .info-row { display: flex; margin-bottom: 8px; }
          .info-label { font-weight: bold; width: 120px; }
          .medications { margin-top: 30px; }
          .medication-item { margin: 15px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
          .medication-name { font-weight: bold; font-size: 16px; margin-bottom: 8px; }
          .medication-details { color: #555; font-size: 14px; }
          .footer { margin-top: 50px; text-align: center; }
          .signature-line { border-top: 1px solid #333; width: 250px; margin: 60px auto 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RECEITA MÉDICA</h1>
          <p>Data: ${format(new Date(prescription.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
        </div>
        <div class="info-section">
          <div class="info-row"><span class="info-label">Paciente:</span><span>${prescription.patient_name}</span></div>
          <div class="info-row"><span class="info-label">Médico:</span><span>${prescription.attendant_name}</span></div>
          ${prescription.diagnosis ? `<div class="info-row"><span class="info-label">Diagnóstico:</span><span>${prescription.diagnosis}</span></div>` : ''}
        </div>
        <div class="medications">
          <h2>Medicamentos</h2>
          ${prescription.medications.map((med, i) => `
            <div class="medication-item">
              <div class="medication-name">${i + 1}. ${med.name}</div>
              <div class="medication-details">
                ${med.dosage ? `Dosagem: ${med.dosage}<br>` : ''}
                ${med.frequency ? `Frequência: ${med.frequency}<br>` : ''}
                ${med.duration ? `Duração: ${med.duration}<br>` : ''}
                ${med.instructions ? `Instruções: ${med.instructions}` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="footer">
          <div class="signature-line"></div>
          <p>${prescription.attendant_name}</p>
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {prescription.patient_name}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Stethoscope className="h-3 w-3" />
              <span>{prescription.attendant_name}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border z-50">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {prescription.diagnosis && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            <span className="font-medium">Diagnóstico:</span> {prescription.diagnosis}
          </p>
        )}
        
        <div className="flex flex-wrap gap-1">
          {prescription.medications.slice(0, 3).map((med, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              <Pill className="h-3 w-3 mr-1" />
              {med.name}
            </Badge>
          ))}
          {prescription.medications.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{prescription.medications.length - 3}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {format(new Date(prescription.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </CardContent>
    </Card>
  );
}
