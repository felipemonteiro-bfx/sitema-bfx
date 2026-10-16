"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { logoSrcParaBrowser } from "@/lib/storage-policy";
import { useRouter } from "next/navigation";

export function LogoUploadForm({ currentLogoPath }: { currentLogoPath?: string }) {
  const router = useRouter();
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
        // Era window.location.reload(). O refresh so refaz os dados do servidor,
        // entao a limpeza que o reload fazia de graca agora e explicita: sem ela o
        // botao continua armado com o mesmo arquivo (reenvio duplicado no storage)
        // e o preview local segue na frente da logo que o servidor devolveu.
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setFile(null);
        router.refresh();
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

  const displayUrl = previewUrl || (currentLogoPath ? logoSrcParaBrowser(currentLogoPath) : null);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Logo atual:</h3>
        <div className="relative w-32 h-32 rounded-interno overflow-hidden p-2 bg-poco flex items-center justify-center">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt="Logo atual"
              fill
              unoptimized
              className="object-contain p-2"
            />
          ) : (
            <span className="text-xs text-muted-foreground text-center">Nenhuma logo cadastrada</span>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="logo-upload" className="normal-case tracking-normal block leading-normal text-foreground">
          Carregar nova logo
        </Label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Label htmlFor="logo-upload" className="normal-case tracking-normal cursor-pointer leading-normal text-foreground">
            <span className="inline-flex h-11 items-center justify-center rounded-controle border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
              Escolher arquivo
            </span>
            {/* `<input>` cru de proposito — excecao legitima, ja documentada para
                `type="file"`. Com `<Input>` o `sr-only` NAO escondia: a base do
                componente traz `w-full h-10`, e o tailwind-merge nao trata
                `sr-only` como conflitante com `w-*`/`h-*`, entao o `width:1px`
                / `height:1px` perdia. O campo renderizava 1078x40px e era a
                unica das 21 rotas com rolagem horizontal em 1440px
                (scrollWidth 1471). Fase 18, achado 2. */}
            <input
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              className="sr-only"
            />
          </Label>
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
