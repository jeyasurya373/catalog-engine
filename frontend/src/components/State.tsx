export function Loading() {
  return <div className="state">Loading data...</div>;
}

export function Empty({ label = "No data found" }: { label?: string }) {
  return <div className="state">{label}</div>;
}

export function ErrorState({ error }: { error: unknown }) {
  return <div className="state error">{error instanceof Error ? error.message : "Something went wrong"}</div>;
}
