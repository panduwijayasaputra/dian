'use client'

import { DropZone } from './drop-zone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: (documentId: string) => void
}

export function UploadModal({ open, onOpenChange, onUploadComplete }: UploadModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Unggah Dokumen</DialogTitle>
        </DialogHeader>
        <DropZone
          onUploadComplete={(id) => {
            onOpenChange(false)
            onUploadComplete(id)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
