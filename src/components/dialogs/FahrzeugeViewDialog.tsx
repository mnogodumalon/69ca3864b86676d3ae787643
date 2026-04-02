import type { Fahrzeuge } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface FahrzeugeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Fahrzeuge | null;
  onEdit: (record: Fahrzeuge) => void;
}

export function FahrzeugeViewDialog({ open, onClose, record, onEdit }: FahrzeugeViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fahrzeuge anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kennzeichen</Label>
            <p className="text-sm">{record.fields.kennzeichen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Marke / Modell</Label>
            <p className="text-sm">{record.fields.marke_modell ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fahrzeugtyp</Label>
            <Badge variant="secondary">{record.fields.fahrzeugtyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Führerscheinklasse</Label>
            <Badge variant="secondary">{record.fields.fuehrerscheinklasse?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zustand</Label>
            <Badge variant="secondary">{record.fields.zustand?.label ?? '—'}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}