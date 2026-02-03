import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Streamlit</h1>
          <p className="text-sm text-muted-foreground">Dashboards avançados em tempo real.</p>
        </div>
        <Button asChild variant="outline">
          <a href="/_streamlit/" target="_blank" rel="noreferrer">
            Abrir em nova aba
          </a>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Visualização</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-xl border bg-background p-0">
          <iframe src="/_streamlit/" className="h-[calc(100vh-16rem)] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
