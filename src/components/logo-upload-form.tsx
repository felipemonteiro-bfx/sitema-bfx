"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LogoUploadForm({ currentLogoPath }: { currentLogoPath?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const f = event.target.files[0];
      setFile(f);
      // Preview local do arquivo selecionado
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warning("Nenhum arquivo selecionado.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Logo enviada com sucesso!");
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast.error(`Falha ao enviar logo: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Erro ao enviar logo:", error);
      toast.error("Erro de rede ou servidor ao enviar logo.");
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || (currentLogoPath ? (currentLogoPath.startsWith("/") ? currentLogoPath : `/${currentLogoPath}`) : null);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Logo atual:</h3>
        <div className="relative w-32 h-32 border rounded-md overflow-hidden p-2 bg-muted/30 flex items-center justify-center">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Logo atual"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground text-center">Nenhuma logo cadastrada</span>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="logo-upload" className="block text-sm font-medium text-foreground">
          Carregar nova logo
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer">
            <span className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
              Escolher arquivo
            </span>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          <span className="text-sm text-muted-foreground">
            {file ? file.name : "Nenhum arquivo selecionado"}
          </span>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "Enviando..." : "Enviar logo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
