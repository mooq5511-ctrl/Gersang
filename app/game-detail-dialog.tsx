'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import './game-detail-dialog.css';

/** Reuse the existing accessible dialog, including Escape and focus restoration. */
export function GameDetailDialog({ title, description, trigger, triggerClassName = 'game-detail-entry', children }: {
  title: string; description: string; trigger: ReactNode; triggerClassName?: string; children: ReactNode;
}) {
  return <Dialog>
    <DialogTrigger render={<button type="button" className={triggerClassName}/>}>{trigger}</DialogTrigger>
    <DialogContent className="game-detail-dialog" overlayClassName="game-detail-overlay" showCloseButton={false}>
      <header className="game-detail-heading"><DialogTitle>{title}</DialogTitle><DialogClose render={<button type="button" aria-label={`關閉${title}`}/>}>×</DialogClose></header>
      <DialogDescription>{description}</DialogDescription>
      <div className="game-detail-body">{children}</div>
    </DialogContent>
  </Dialog>;
}
