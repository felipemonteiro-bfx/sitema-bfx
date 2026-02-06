'use client';

import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  vendaId: number;
  deleteAction: (formData: FormData) => Promise<void>;
}

export function DeleteVendaButton({ vendaId, deleteAction }: Props) {
  const [loading, setLoading] = useState(false);

  return (
    <Button 
      type="button" 
      variant="destructive" 
      size="sm" 
      disabled={loading}
      onClick={async () => {
        if (!confirm("Tem certeza que deseja excluir esta venda permanentemente?")) {
          return;
        }

        setLoading(true);
        try {
          const formData = new FormData();
          formData.append('id', vendaId.toString());
          await deleteAction(formData);
        } catch (error) {
          alert("Erro ao excluir venda.");
        } finally {
          setLoading(false);
        }
      }}
      className="flex items-center gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Excluir Venda
    </Button>
  );
}
