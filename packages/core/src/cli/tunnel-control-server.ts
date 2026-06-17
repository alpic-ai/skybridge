import http from "node:http";
import { type OpenTunnelFn, TunnelManager } from "./tunnel.js";
import { createTunnelHandler } from "./tunnel-handler.js";

export type TunnelControlServer = {
  port: number;
  manager: TunnelManager;
  close: () => Promise<void>;
};

export async function startTunnelControlServer(
  getPort: () => number,
  options?: { openTunnel?: OpenTunnelFn },
): Promise<TunnelControlServer> {
  const manager = new TunnelManager({
    getPort,
    openTunnel: options?.openTunnel,
  });
  const server = http.createServer(createTunnelHandler(manager));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (typeof address === "string" || address === null) {
    server.close();
    throw new Error("tunnel control server has no address");
  }
  return {
    port: address.port,
    manager,
    close: () =>
      new Promise<void>((resolve, reject) => {
        manager.stop();
        // Force any in-flight SSE connections to drop so server.close()
        // doesn't hang indefinitely on subscribers that never end on their own.
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
