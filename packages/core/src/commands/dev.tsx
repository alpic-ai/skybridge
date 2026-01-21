import { Command, Flags } from "@oclif/core";
import { Box, render, Text } from "ink";
import { Header } from "../cli/header.js";
import { useNodemon } from "../cli/use-nodemon.js";
import { useTypeScriptCheck } from "../cli/use-typescript-check.js";

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
      const tsErrors = useTypeScriptCheck();
      const messages = useNodemon(env);

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
          {tsErrors.length > 0 && (
            <Box marginTop={1} flexDirection="column">
              <Text color="red" bold>
                ⚠️ TypeScript errors found:
              </Text>
              {tsErrors.map((error) => (
                <Box
                  key={`${error.file}:${error.line}:${error.col}`}
                  marginLeft={2}
                  flexDirection="column"
                >
                  <Box>
                    <Text color="white">{error.file}</Text>
                    <Text color="grey">
                      ({error.line},{error.col}):{" "}
                    </Text>
                  </Box>
                  <Box marginLeft={2}>
                    <Text color="red">{error.message}</Text>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {messages.length > 0 && (
            <Box marginTop={1} flexDirection="column">
              <Text color="white" bold>
                Logs:
              </Text>
              {messages.map((message, index) => (
                <Box
                  key={`${message.type}-${index}-${message.text.slice(0, 20)}`}
                  marginLeft={2}
                >
                  {message.type === "restart" ? (
                    <>
                      <Text color="green">✓{"  "}</Text>
                      <Text color="white">{message.text}</Text>
                    </>
                  ) : message.type === "error" ? (
                    <Text color="red">{message.text}</Text>
                  ) : (
                    <Text>{message.text}</Text>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      );
    };

    render(<App />, { exitOnCtrlC: true, patchConsole: true });
  }
}
