import { useRef, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImportProductsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportProductsDialog({ open, onClose }: ImportProductsDialogProps) {
  const { importProducts, downloadImportTemplate } = useInventoryStore();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleClose = () => {
    setImportFile(null);
    onClose();
  };

  const handleImport = async () => {
    if (!importFile) return toast.error("Selecciona un archivo .xlsx");
    setImporting(true);
    try {
      const result = await importProducts(importFile);
      const errors = result.errors?.length ? ` · ${result.errors.length} con error` : "";
      toast.success(
        `Importación: ${result.products_created} productos, ${result.variants_created} variantes${errors}`,
      );
      if (result.errors?.length) {
        result.errors.slice(0, 3).forEach((msg) => toast.error(msg));
      }
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar productos desde Excel</DialogTitle>
          <DialogDescription>
            Cada fila es una variante (producto, marca, categoría, precios, talla, color, stock).
            Las marcas y categorías nuevas se crean automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              downloadImportTemplate().catch((e) =>
                toast.error(e instanceof Error ? e.message : "Error al descargar"),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Descargar plantilla
          </Button>

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/50"
          >
            <FileSpreadsheet className="h-8 w-8" />
            {importFile ? (
              <span className="font-medium text-foreground">{importFile.name}</span>
            ) : (
              <span>Haz clic para seleccionar un archivo .xlsx</span>
            )}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setImportFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleImport} disabled={importing || !importFile}>
            {importing ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
