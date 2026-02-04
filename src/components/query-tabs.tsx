"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryParam } from "@/lib/use-query-param";

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
  const [tab, setTab] = useQueryParam(param, defaultTab);

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
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
