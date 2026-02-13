import { useWorkspaceStore } from "../store";
import { useWebSocket } from "./useWebSocket";

export function useExecution() {
    const { wsStatus } = useWorkspaceStore();
    const { execute, executeWithResult } = useWebSocket();

    return { execute, executeWithResult, wsStatus };
}
