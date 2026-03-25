export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 7.072M12 12h.01" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Sem conexão</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Você está offline. Verifique sua conexão e tente novamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Tentar novamente
      </button>
    </div>
  );
}
