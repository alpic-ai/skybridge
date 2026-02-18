import net from "node:net";

/**
 * Returns the given port if available, otherwise lets the OS
 * pick a free port via `listen(0)`.
 *
 * @param host - Bind address for the check. Pass `"localhost"` for
 *   services that bind to 127.0.0.1 (e.g. Vite HMR). Omit for
 *   services that bind to all interfaces (e.g. the HTTP server).
 */
export async function detectAvailablePort(
  startPort: number,
  host?: string,
): Promise<number> {
  const available = await isPortAvailable(startPort, host);
  if (available) return startPort;

  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.once("listening", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        const { port } = addr;
        server.close(() => resolve(port));
      } else {
        server.close(() =>
          reject(new Error("Failed to detect available port")),
        );
      }
    });

    server.listen(0, host);
  });
}

function isPortAvailable(port: number, host?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}
