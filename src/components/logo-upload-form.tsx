"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LogoUploadForm({ currentLogoPath }: { currentLogoPath?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Nenhum arquivo selecionado.");
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
        alert("Logo enviada com sucesso!");
        // For simplicity, reload the page to show the new logo and revalidate data
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Falha ao enviar logo: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Erro ao enviar logo:", error);
      alert("Erro de rede ou servidor ao enviar logo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {currentLogoPath && (
        <div>
          <h3 className="text-sm font-medium mb-2">Logo atual:</h3>
          <div className="relative w-32 h-32 border rounded-md overflow-hidden p-2">
            <Image
              src={currentLogoPath}
              alt="Current Logo"
              layout="fill"
              objectFit="contain"
            />
          </div>
        </div>
      )}
      <div>
        <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700">
          Carregar nova logo
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <Input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} />
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "Enviando..." : "Upload Logo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
