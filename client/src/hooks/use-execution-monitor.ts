import { useState, useEffect, useCallback } from "react";
import type { ExecutionProgress } from "@shared/schema";

export interface ExecutionState {
  progress: ExecutionProgress | null;
  isConnected: boolean;
  error: string | null;
}

export function useExecutionMonitor(
  executionId: number | null
): ExecutionState {
  const [state, setState] = useState<ExecutionState>({
    progress: null,
    isConnected: false,
    error: null,
  });

  useEffect(() => {
    if (!executionId) return;

    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource(`/api/executions/${executionId}/stream`);

        eventSource.onopen = () => {
          setState((prev) => ({
            ...prev,
            isConnected: true,
            error: null,
          }));
        };

        eventSource.onmessage = (event) => {
          try {
            const progress = JSON.parse(event.data) as ExecutionProgress;
            setState((prev) => ({
              ...prev,
              progress,
            }));

            // Close connection when execution completes
            if (progress.status === "completed" || progress.status === "failed") {
              eventSource?.close();
              setState((prev) => ({
                ...prev,
                isConnected: false,
              }));
            }
          } catch (err) {
            console.error("Failed to parse SSE data:", err);
          }
        };

        eventSource.onerror = () => {
          setState((prev) => ({
            ...prev,
            isConnected: false,
            error: "Connection lost",
          }));
          eventSource?.close();
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to connect to execution stream";
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: message,
        }));
      }
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [executionId]);

  return state;
}
