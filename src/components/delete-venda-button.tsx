'use client';

import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  vendaId: number;
  onDelete: (formData: FormData) => Promise<void>;
}

export function DeleteVendaButton({ vendaId, onDelete }: Props) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (formData: FormData) => {
    if (!confirm("Tem certeza que deseja excluir esta venda permanentemente?")) {
      return;
    }

    setLoading(true);
    try {
      await onDelete(formData);
    } catch (error) {
      alert("Erro ao excluir venda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form action={handleAction}>
      <input type="hidden" name="id" value={vendaId} />
      <Button 
        type="submit" 
        variant="destructive" 
        size="sm" 
        disabled={loading}
        className="flex items-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Excluir Venda
      </Button>
    </form>
  );
}
