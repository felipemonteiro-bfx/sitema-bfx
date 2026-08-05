"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseAsString, useQueryState } from "nuqs";

export type QueryTabItem = {
  value: string;
  label: string;
  content: React.ReactNode;
};

export function QueryTabs({
  tabs,
  defaultTab,
  param = "tab",
}: {
  tabs: QueryTabItem[];
  defaultTab: string;
  param?: string;
}) {
  const [tab, setTab] = useQueryState(
    param,
    parseAsString.withDefault(defaultTab).withOptions({ history: "push", shallow: true })
  );

  return (
    <Tabs value={tab} onValueChange={setTab}>
      {/* A rolagem horizontal precisa ser do proprio tablist. Em 390px as abas
          de /financeiro e /boletos medem 476px: sem `max-w-full` o `inline-flex`
          estoura o container e quem rola e a PAGINA (scrollWidth 505 vs
          clientWidth 390), porque `overflow-x` fica `visible` ate o <main>
          (fase 16, achado 3). */}
      <TabsList className="max-w-full justify-start overflow-x-auto">
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
