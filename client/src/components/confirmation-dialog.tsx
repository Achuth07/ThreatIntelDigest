import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 border-slate-700">
        <DialogHeader className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              variant === 'destructive' 
                ? 'bg-red-500/20 text-red-400' 
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-slate-100 text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 text-base leading-relaxed pl-10">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2 pt-4">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={loading}
            className="bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100 border-slate-600"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-cyber-blue hover:bg-blue-600 text-white'
            }
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}