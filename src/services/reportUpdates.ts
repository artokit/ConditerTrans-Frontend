import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../api/client';
import { getAccessToken } from '../api/tokenStorage';

export interface ReportChangedEvent {
  date: string;
  orderId: string;
  version: string;
}

export function subscribeToReportChanges(
  onChanged: (event?: ReportChangedEvent) => void,
): () => void {
  let disposed = false;
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/reports`, {
      accessTokenFactory: async () => (await getAccessToken()) ?? '',
      withCredentials: false,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  connection.on('ReportChanged', (event: ReportChangedEvent) => onChanged(event));
  connection.onreconnected(() => onChanged());

  const start = async () => {
    while (!disposed && connection.state === signalR.HubConnectionState.Disconnected) {
      try {
        await connection.start();
      } catch (error: unknown) {
        if (!disposed) {
          console.warn('Не удалось подключиться к обновлениям отчёта', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  };

  connection.onclose(() => {
    if (!disposed) void start();
  });

  void start();

  return () => {
    disposed = true;
    connection.off('ReportChanged');
    void connection.stop();
  };
}
