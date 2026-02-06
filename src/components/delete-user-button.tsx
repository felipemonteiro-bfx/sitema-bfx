'use client';

import { Button } from "@/components/ui/button";
import { UserMinus, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  userId: number;
  userName: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

export function DeleteUserButton({ userId, userName, deleteAction }: Props) {
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!confirm(`Tem certeza que deseja remover o usuário "${userName}" do sistema?
Esta ação não poderá ser desfeita.`)) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', userId.toString());
      await deleteAction(formData);
    } catch (error) {
      alert("Erro ao remover usuário.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      type="button" 
      variant="destructive" 
      size="sm" 
      disabled={loading}
      onClick={handleAction}
      className="flex items-center gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
      Excluir Vendedor
    </Button>
  );
}
