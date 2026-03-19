"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  ScanBarcode,
  Keyboard,
  FileDigit,
} from "lucide-react";

interface NfeInfo {
  uf: string;
  anoMes: string;
  cnpj: string;
  modelo: string;
  serie: string;
  numero: string;
}

const UF_CODES: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA",
  "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE",
  "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE",
  "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT",
  "52": "GO", "53": "DF",
};

function parseChaveNfe(chave: string): NfeInfo | null {
  const clean = chave.replace(/\D/g, "");
  if (clean.length !== 44) return null;

  const ufCode = clean.substring(0, 2);
  const uf = UF_CODES[ufCode] || ufCode;
  const anoMes = `20${clean.substring(2, 4)}/${clean.substring(4, 6)}`;
  const cnpjRaw = clean.substring(6, 20);
  const cnpj = `${cnpjRaw.substring(0, 2)}.${cnpjRaw.substring(2, 5)}.${cnpjRaw.substring(5, 8)}/${cnpjRaw.substring(8, 12)}-${cnpjRaw.substring(12, 14)}`;
  const modelo = clean.substring(20, 22);
  const serie = clean.substring(22, 25);
  const numero = clean.substring(25, 34);

  return { uf, anoMes, cnpj, modelo, serie, numero };
}

function formatChaveVisual(chave: string): string {
  const clean = chave.replace(/\D/g, "");
  return clean.replace(/(\d{4})(?=\d)/g, "$1 ");
}

interface NfeKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onInfoParsed?: (info: NfeInfo | null) => void;
}

export function NfeKeyInput({ value, onChange, onInfoParsed }: NfeKeyInputProps) {
  const [modo, setModo] = React.useState<"digitar" | "scanner">("digitar");
  const [scanning, setScanning] = React.useState(false);
  const [cameraError, setCameraError] = React.useState("");
  const scannerRef = React.useRef<HTMLDivElement>(null);
  const html5QrCodeRef = React.useRef<any>(null);

  const cleanValue = value.replace(/\D/g, "");
  const isValid = cleanValue.length === 44;
  const parsed = isValid ? parseChaveNfe(cleanValue) : null;

  React.useEffect(() => {
    onInfoParsed?.(parsed);
  }, [cleanValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").substring(0, 44);
    onChange(raw);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").substring(0, 44);
    onChange(pasted);
  };

  const startScanner = React.useCallback(async () => {
    setCameraError("");
    setScanning(true);

    await new Promise((r) => setTimeout(r, 100));

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (!scannerRef.current) return;

      const scannerId = "nfe-scanner-region";
      scannerRef.current.id = scannerId;

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText: string) => {
          let extracted = decodedText.replace(/\D/g, "");

          if (extracted.length > 44) {
            const idx44 = extracted.indexOf(extracted.substring(0, 2));
            extracted = extracted.substring(idx44, idx44 + 44);
          }

          if (extracted.length >= 44) {
            extracted = extracted.substring(0, 44);
            onChange(extracted);
            stopScanner();
          }
        },
        () => {}
      );
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setCameraError("Permissão de câmera negada. Verifique as configurações do navegador.");
      } else if (msg.includes("NotFound") || msg.includes("device")) {
        setCameraError("Nenhuma câmera encontrada neste dispositivo.");
      } else {
        setCameraError("Erro ao acessar a câmera: " + msg);
      }
      setScanning(false);
    }
  }, [onChange]);

  const stopScanner = React.useCallback(async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch {}
    setScanning(false);
  }, []);

  React.useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <FileDigit className="h-3.5 w-3.5" />
          Chave de Acesso NF-e (44 dígitos)
        </Label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => { setModo("digitar"); stopScanner(); }}
            className={cn(
              buttonVariants({ variant: modo === "digitar" ? "default" : "ghost", size: "sm" }),
              "h-7 px-2 text-xs",
              modo === "digitar" && "bg-blue-900 hover:bg-blue-800"
            )}
          >
            <Keyboard className="h-3 w-3 mr-1" />
            Digitar
          </button>
          <button
            type="button"
            onClick={() => { setModo("scanner"); startScanner(); }}
            className={cn(
              buttonVariants({ variant: modo === "scanner" ? "default" : "ghost", size: "sm" }),
              "h-7 px-2 text-xs",
              modo === "scanner" && "bg-blue-900 hover:bg-blue-800"
            )}
          >
            <ScanBarcode className="h-3 w-3 mr-1" />
            Escanear
          </button>
        </div>
      </div>

      {modo === "digitar" && (
        <div className="space-y-2">
          <div className="relative">
            <Input
              value={formatChaveVisual(value)}
              onChange={handleInputChange}
              onPaste={handlePaste}
              placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
              className={cn(
                "font-mono text-sm tracking-wider pr-10",
                isValid && "border-emerald-500 focus-visible:ring-emerald-500/60",
                cleanValue.length > 0 && !isValid && "border-amber-500 focus-visible:ring-amber-500/60"
              )}
              inputMode="numeric"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : cleanValue.length > 0 ? (
                <span className="text-xs font-mono text-amber-600">{cleanValue.length}/44</span>
              ) : null}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Cole ou digite os 44 dígitos da chave de acesso da NF-e. Encontrada no DANFE ou no XML.
          </p>
        </div>
      )}

      {modo === "scanner" && (
        <div className="space-y-2">
          {scanning ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-blue-900/30 bg-black">
              <div ref={scannerRef} className="w-full" style={{ minHeight: 280 }} />
              <button
                type="button"
                onClick={stopScanner}
                className={cn(
                  buttonVariants({ variant: "destructive", size: "sm" }),
                  "absolute top-2 right-2 z-10 h-8 px-2 shadow-lg"
                )}
              >
                <X className="h-4 w-4 mr-1" />
                Fechar
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-white text-xs text-center">
                  Aponte a câmera para o código de barras ou QR Code da nota fiscal
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startScanner}
              className="w-full flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-900/10">
                <Camera className="h-7 w-7 text-blue-900" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">Abrir Câmera</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Escaneie o código de barras ou QR Code da NF-e
                </div>
              </div>
            </button>
          )}

          {cameraError && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      )}

      {isValid && cleanValue && (
        <input type="hidden" name="chaveNfe" value={cleanValue} />
      )}

      {parsed && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Chave validada — dados extraídos:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">UF</div>
              <Badge variant="secondary" size="sm">{parsed.uf}</Badge>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Data</div>
              <Badge variant="secondary" size="sm">{parsed.anoMes}</Badge>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">CNPJ Emitente</div>
              <Badge variant="secondary" size="sm" className="font-mono text-[10px]">{parsed.cnpj}</Badge>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Modelo</div>
              <Badge variant="secondary" size="sm">{parsed.modelo === "55" ? "NF-e" : parsed.modelo === "65" ? "NFC-e" : parsed.modelo}</Badge>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Série</div>
              <Badge variant="secondary" size="sm">{parsed.serie}</Badge>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Número</div>
              <Badge variant="secondary" size="sm">{parseInt(parsed.numero, 10)}</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
