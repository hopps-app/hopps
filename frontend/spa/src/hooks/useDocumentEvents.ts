import { useEffect, useRef } from 'react';

export interface DocumentChangeMessage {
    documentId: number;
    organizationId: number | null;
}

/**
 * Derives the WebSocket URL for the document-change channel from the configured API base URL. Absolute http(s) bases
 * become ws(s); a relative base (e.g. "/api" behind a proxy) falls back to the current page origin.
 */
function getDocumentSocketUrl(): string {
    const apiBase = import.meta.env.VITE_API_ORG_URL as string | undefined;
    if (apiBase && /^https?:\/\//i.test(apiBase)) {
        return apiBase.replace(/^http/i, 'ws').replace(/\/+$/, '') + '/ws/documents';
    }
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}/ws/documents`;
}

/**
 * Subscribes to backend document-change notifications. The callback fires for every change with the affected document
 * ID; the socket reconnects automatically with a short backoff. The caller decides what to reload — we always reload the
 * whole list.
 */
export function useDocumentEvents(onChange: (msg: DocumentChangeMessage) => void) {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        let socket: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let closed = false;

        const scheduleReconnect = () => {
            if (closed || reconnectTimer) return;
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connect();
            }, 3000);
        };

        const connect = () => {
            if (closed) return;
            try {
                socket = new WebSocket(getDocumentSocketUrl());
            } catch {
                scheduleReconnect();
                return;
            }
            socket.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data) as DocumentChangeMessage;
                    if (msg && typeof msg.documentId === 'number') {
                        onChangeRef.current(msg);
                    }
                } catch {
                    /* ignore malformed messages */
                }
            };
            socket.onclose = () => {
                if (!closed) scheduleReconnect();
            };
            socket.onerror = () => {
                socket?.close();
            };
        };

        connect();

        return () => {
            closed = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            socket?.close();
        };
    }, []);
}
