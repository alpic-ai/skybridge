import { Command, Flags } from "@oclif/core";
import { Box, render, Text } from "ink";
import nodemon, { type NodemonSettings } from "nodemon";
import { useEffect } from "react";
import { Header } from "../cli/header.js";

export default class Dev extends Command {
  static override description = "Start development server";
  static override examples = ["skybridge"];
  static override flags = {
    "use-forwarded-host": Flags.boolean({
      description:
        "Uses the forwarded host header to construct widget URLs instead of localhost, useful when accessing the dev server through a tunnel (e.g., ngrok)",
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Dev);

    const env = {
      ...process.env,
      ...(flags["use-forwarded-host"]
        ? { SKYBRIDGE_USE_FORWARDED_HOST: "true" }
        : {}),
    };

    const App = () => {
      useEffect(() => {
        nodemon({
          env,
          configFile: "nodemon.json",
        } as NodemonSettings);

        nodemon
          // @ts-expect-error - nodemon types don't include "restart" event
          .on("restart", (files: string[]) => {
            console.log(
              "\n\x1b[32m✓\x1b[0m  App restarted due to file changes: \x1b[36m%s\x1b[0m",
              files.join(", "),
            );
          });
      }, []);

      return (
        <Box flexDirection="column" padding={1} marginLeft={1}>
          <Header version={this.config.version} />
          <Box>
            <Text color="green">→{"  "}</Text>
            <Text color="white" bold>
              Open DevTools to test your app locally:{" "}
            </Text>
            <Text color="green">http://localhost:3000/</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="#20a832">→{"  "}</Text>
            <Text>MCP server running at:{"  "}</Text>
            <Text color="white" bold>
              http://localhost:3000/mcp
            </Text>
          </Box>
          <Text color="white" underline>
            To test on ChatGPT:
          </Text>
          <Box>
            <Text color="#20a832">→{"  "}</Text>
            <Text color="grey">Make your local server accessible with </Text>
            <Text color="white" bold>
              ngrok http 3000
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text>
              <Text color="#20a832">→{"  "}</Text>
              <Text color="grey">Connect to ChatGPT with URL </Text>
              <Text color="white" bold>
                https://xxxxxx.ngrok-free.app/mcp
              </Text>
            </Text>
          </Box>
          <Box>
            <Text>
              <Text color="#20a832">→{"  "}</Text>
              <Text>Documentation: </Text>
              <Text color="white" bold>
                https://docs.skybridge.tech/
              </Text>
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text>
              <Text color="#20a832">→{"  "}</Text>
              <Text>If you like Skybridge, please </Text>
              <Text color="white" bold>
                give it a star{" "}
              </Text>
              <Text>on GitHub: </Text>
              <Text color="white" underline>
                https://github.com/alpic-ai/skybridge
              </Text>
              <Text color="grey"> 🙏</Text>
            </Text>
          </Box>
        </Box>
      );
    };

    render(<App />, { exitOnCtrlC: true, patchConsole: false });
  }
}
