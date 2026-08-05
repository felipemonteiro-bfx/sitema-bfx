"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseAsString, useQueryState } from "nuqs";

export type TabItem = {
  value: string;
  label: string;
  content: React.ReactNode;
};

export function GestaoRhTabs({
  tabs,
  defaultTab,
}: {
  tabs: TabItem[];
  defaultTab: string;
}) {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault(defaultTab).withOptions({ history: "push", shallow: true })
  );

  return (
    <Tabs value={tab} onValueChange={setTab}>
      {/* Mesma contencao que o `QueryTabs` ja tinha desde a fase 16 e que aqui
          nunca foi aplicada: sem `max-w-full` + `overflow-x-auto` a faixa de
          abas estoura o container e quem rola e a PAGINA, porque `overflow-x`
          fica `visible` ate o `<main>`. O `h-auto min-h-10` acompanha: com
          `overflow-x` diferente de `visible` o `overflow-y` computa `auto`, e
          em barra de rolagem classica (Windows/Linux) a barra horizontal
          comeria ~15px dos 40px de altura e cortaria os gatilhos. */}
      <TabsList className="h-auto min-h-10 max-w-full justify-start overflow-x-auto overflow-y-hidden">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value}>
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
