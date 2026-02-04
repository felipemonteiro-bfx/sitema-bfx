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
