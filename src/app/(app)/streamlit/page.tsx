import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Streamlit</h1>
        <Button asChild variant="outline">
          <a href="/_streamlit/" target="_blank" rel="noreferrer">
            Abrir em nova aba
          </a>
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-background">
        <iframe
          src="/_streamlit/"
          className="h-[calc(100vh-12rem)] w-full"
        />
      </div>
    </div>
  );
}
