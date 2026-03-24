import {
  json as jsonParser,
  type Request,
  type Response,
  Router,
} from "express";

export class ScreenshotBridge {
  private sseClients = new Set<Response>();
  private pending = new Map<
    string,
    { resolve: (v: string) => void; reject: (e: Error) => void }
  >();

  createExpressRouter(): Router {
    const router = Router();

    // Browser connects here and keeps the connection open (SSE)
    router.get("/devtools/screenshot/stream", (req: Request, res: Response) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      this.sseClients.add(res);
      req.on("close", () => {
        this.sseClients.delete(res);
      });
    });

    // Browser posts the captured image here — 20mb to handle base64 PNG payloads
    router.post(
      "/devtools/screenshot/result",
      jsonParser({ limit: "20mb" }),
      (req: Request, res: Response) => {
        const { requestId, dataUrl, error } = req.body as {
          requestId: string;
          dataUrl?: string;
          error?: string;
        };
        const entry = this.pending.get(requestId);
        if (entry) {
          if (error) {
            entry.reject(new Error(error));
          } else if (dataUrl) {
            entry.resolve(dataUrl);
          }
          this.pending.delete(requestId);
        }
        res.sendStatus(200);
      },
    );

    return router;
  }

  async requestScreenshot(): Promise<string> {
    if (this.sseClients.size === 0) {
      throw new Error("No devtools browser connected");
    }
    const requestId = crypto.randomUUID();
    const promise = new Promise<string>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId);
          reject(new Error("Screenshot timed out after 35s"));
        }
      }, 35_000);
    });
    const event = `data: ${JSON.stringify({ requestId })}\n\n`;
    for (const client of this.sseClients) {
      client.write(event);
    }
    return promise;
  }
}
