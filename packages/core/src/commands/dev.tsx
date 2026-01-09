import { spawn } from "node:child_process";
import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect } from "react";
import { useVersion } from "../cli/use-version.js";

export default class Dev extends Command {
  static override description = "Start development server";
  static override examples = ["skybridge dev"];
  static override flags = {};

  public async run(): Promise<void> {
    console.clear();

    const App = () => {
      const version = useVersion();

      useEffect(() => {
        const nodemon = spawn("nodemon", ["--quiet"], {
          stdio: ["ignore", "ignore", "inherit"],
        });

        return () => {
          if (nodemon && !nodemon.killed) {
            nodemon.kill();
          }
        };
      }, []);

      return (
        <Box flexDirection="column" padding={1} marginLeft={1}>
          <Box marginBottom={1}>
            <Text color="cyan" bold>
              ⛰{"  "}Welcome to Skybridge
            </Text>
            <Text color="cyan"> v{version}</Text>
          </Box>
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
                https://skybridge.tech/
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
