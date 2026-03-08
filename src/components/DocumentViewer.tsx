
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Printer, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { printHtmlDocument } from "@/lib/print";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentType: 'document' | 'photo';
}

const DocumentViewer = ({ isOpen, onClose, documentUrl, documentName, documentType }: DocumentViewerProps) => {
  const { toast } = useToast();

  const handlePrint = () => {
    const printContent =
      documentType === 'photo'
        ? `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Imprimir ${documentName}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh;
                  font-family: Arial, sans-serif;
                }
                .container {
                  text-align: center;
                  max-width: 100%;
                }
                img { 
                  max-width: 100%; 
                  max-height: 80vh; 
                  object-fit: contain;
                  border: 1px solid #ddd;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                h1 {
                  color: #333;
                  margin-bottom: 20px;
                  font-size: 24px;
                }
                @media print {
                  body { padding: 0; }
                  h1 { font-size: 18px; margin-bottom: 10px; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>${documentName}</h1>
                <img src="${documentUrl}" alt="${documentName}" />
              </div>
            </body>
          </html>
        `
        : `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Imprimir ${documentName}</title>
              <style>
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                .header { padding: 20px; text-align: center; border-bottom: 1px solid #ddd; }
                iframe { width: 100%; height: calc(100vh - 80px); border: none; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${documentName}</h1>
              </div>
              <iframe src="${documentUrl}" title="${documentName}"></iframe>
            </body>
          </html>
        `;

    const opened = printHtmlDocument({
      html: printContent,
      printDelayMs: 500,
      onPopupBlocked: () =>
        toast({
          title: "Impressão bloqueada",
          description: "Permita pop-ups para imprimir o documento.",
          variant: "destructive",
        }),
    });

    if (opened) {
      toast({
        title: "Preparando impressão",
        description: `${documentType === 'photo' ? 'Foto' : 'Documento'} sendo preparado para impressão.`,
      });
    }
  };

  const ext = documentName.split('.').pop()?.toLowerCase() ?? '';
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const isImageUrl =
    documentUrl.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(documentUrl) ||
    /\/[^/]*\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(documentUrl);
  const isImage = documentType === 'photo' || isImageUrl || imageExtensions.includes(ext);
  const isPdf = documentUrl.includes('pdf') || ext === 'pdf';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{documentName}</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={onClose} size="sm" variant="outline">
                <X className="w-4 h-4 mr-2" />
                Fechar
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isImage ? (
            <div className="flex justify-center items-center p-4">
              <img 
                src={documentUrl} 
                alt={documentName}
                className="max-w-full max-h-[60vh] object-contain border rounded-lg shadow-sm"
              />
            </div>
          ) : isPdf ? (
            <div className="h-[60vh] w-full">
              <iframe 
                src={documentUrl} 
                title={documentName}
                className="w-full h-full border rounded-lg"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Documento</h3>
              <p className="text-gray-600 mb-4">
                Este tipo de documento não pode ser visualizado diretamente no navegador.
              </p>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewer;
