import { useEffect, useState } from "react";
import nodemon, { type NodemonSettings } from "nodemon";
import { Writable } from "node:stream";

type Message = {
  text: string;
  type: "log" | "restart";
};

export function useNodemon(env: NodeJS.ProcessEnv): Array<Message> {
  const [messages, setMessages] = useState<Array<Message>>([]);

  useEffect(() => {
    nodemon({
      env,
      configFile: "nodemon.json",
      stdout: false,
    } as NodemonSettings);

    nodemon
      // @ts-expect-error - nodemon types don't include "restart" event
      .on("restart", (files: string[]) => {
        const restartMessage = `Server restarted due to file changes: ${files.join(", ")}`;
        setMessages((prev) => [
          ...prev,
          { text: restartMessage, type: "restart" },
        ]);
      });

    nodemon.on("readable", () => {
      const messageStream = new Writable({
        write(chunk: Buffer, _encoding, callback) {
          const message = chunk.toString().trim();
          if (message) {
            setMessages((prev) => [
              ...prev,
              { text: message, type: "log" },
            ]);
          }
          callback();
        },
      });
      // @ts-expect-error - nodemon types don't include "stdout" property
      nodemon.stdout.pipe(messageStream);
    });

    return () => {
      nodemon.emit("quit");
    };
  }, [env]);

  return messages;
}

