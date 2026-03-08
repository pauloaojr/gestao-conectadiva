type PrintDocumentOptions = {
  html: string;
  windowTitle?: string;
  width?: number;
  height?: number;
  printDelayMs?: number;
  autoCloseAfterPrint?: boolean;
  onPopupBlocked?: () => void;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function printHtmlDocument(options: PrintDocumentOptions): boolean {
  const {
    html,
    windowTitle = "_blank",
    width = 900,
    height = 700,
    printDelayMs = 0,
    autoCloseAfterPrint = true,
    onPopupBlocked,
  } = options;

  const printWindow = window.open(
    "",
    windowTitle,
    `width=${width},height=${height}`
  );

  if (!printWindow) {
    onPopupBlocked?.();
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    const runPrint = () => {
      printWindow.focus();
      printWindow.print();
      if (autoCloseAfterPrint) {
        printWindow.onafterprint = () => printWindow.close();
      }
    };

    if (printDelayMs > 0) {
      window.setTimeout(runPrint, printDelayMs);
      return;
    }

    runPrint();
  };

  return true;
}
