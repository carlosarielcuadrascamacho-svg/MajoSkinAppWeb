"use client";

import { useState } from "react";
import BottomSheet from "@/components/BottomSheet";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading: externalLoading,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = externalLoading || internalLoading;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <p className="mb-6 text-sm text-gray-500">{message}</p>
      <div className="flex gap-3 pb-safe">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 rounded-full bg-gray-100 py-3 text-sm font-semibold text-gray-500 transition-all active:scale-95 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 rounded-full bg-danger py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-95 active:shadow-xl disabled:opacity-60"
        >
          {loading ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </BottomSheet>
  );
}
