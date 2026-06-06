import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { ErrorState, Loading } from "../components/State";

export function CrawlMonitor() {
  const client = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["crawl-status"], queryFn: api.crawlStatus, refetchInterval: 10000 });
  const simulate = useMutation({ mutationFn: api.simulateCrawl, onSuccess: () => client.invalidateQueries({ queryKey: ["crawl-status"] }) });
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const source = new EventSource(api.streamUrl);
    source.onmessage = (message) => {
      setEvents((current) => [message.data, ...current].slice(0, 8));
      client.invalidateQueries({ queryKey: ["crawl-status"] });
    };
    return () => source.close();
  }, [client]);

  return (
    <section>
      <div className="pageHeader">
        <div>
          <h1>Crawl Monitor</h1>
          <p>Simulated crawl operations, DOM drift warnings, and live price update stream.</p>
        </div>
        <button onClick={() => simulate.mutate()} disabled={simulate.isPending}>Simulate price crawl</button>
      </div>
      <div className="split">
        <div className="panel">
          <h2>Live Stream</h2>
          {events.length === 0 && <p>No stream events yet.</p>}
          {events.map((event, index) => <pre key={index}>{event}</pre>)}
        </div>
        <div className="panel">
          <h2>Recent Crawl Events</h2>
          {isLoading && <Loading />}
          {error && <ErrorState error={error} />}
          {data?.events.map((event) => (
            <div className="eventRow" key={String(event.id)}>
              <span className={`pill ${event.status === "success" ? "good" : "warn"}`}>{String(event.status)}</span>
              <strong>{String(event.platform)}</strong>
              <span>{String(event.event_type)}</span>
              <small>{String(event.message)}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
