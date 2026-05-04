import { Command, Flags } from "@oclif/core";
import { Box, render, Text } from "ink";
import { resolvePort } from "../cli/detect-port.js";
import { Header } from "../cli/header.js";
import { startTunnelControlServer } from "../cli/tunnel-control-server.js";
import { useMessages } from "../cli/use-messages.js";
import { useNodemon } from "../cli/use-nodemon.js";
import { useTunnel } from "../cli/use-tunnel.js";
import { useTypeScriptCheck } from "../cli/use-typescript-check.js";

export default class Dev extends Command {
  static override description = "Start development server";
  static override examples = ["skybridge"];
  static override flags = {
    port: Flags.integer({
      char: "p",
      description: "Port to run the server on",
      min: 1,
    }),
    tunnel: Flags.boolean({
      description: "Open an Alpic tunnel for remote testing",
      default: false,
    }),
    verbose: Flags.boolean({
      char: "v",
      description: "Show tunnel logs",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Dev);

    const { port, fallback, envWarning } = await resolvePort(flags.port);
    if (envWarning) {
      this.warn(envWarning);
    }

    const {
      port: controlPort,
      manager: tunnelManager,
      close: closeTunnelControl,
    } = await startTunnelControlServer(() => port);

    const env = {
      ...process.env,
      __PORT: String(port),
      __TUNNEL_CONTROL_PORT: String(controlPort),
    };

    const App = () => {
      const tsErrors = useTypeScriptCheck();
      const [messages, pushMessage] = useMessages();
      useNodemon(env, pushMessage);
      const tunnelState = useTunnel(
        port,
        pushMessage,
        flags.verbose,
        flags.tunnel,
      );

      return (
        <Box flexDirection="column" padding={1} marginLeft={1}>
          <Header version={this.config.version} />

          <Box>
            <Text>🏠{"  "}</Text>
            {fallback ? (
              <Text color="yellow">3000 in use, running on </Text>
            ) : (
              <Text>Running on </Text>
            )}
            <Text color="green">{`http://localhost:${port}/mcp`}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="#20a832">→{"  "}</Text>
            <Text color="white" bold>
              Test locally with DevTools:{" "}
            </Text>
            <Text color="green">{`http://localhost:${port}/`}</Text>
          </Box>

          {tunnelState.status === "idle" && (
            <Box>
              <Text>🌍{"  "}</Text>
              <Text>Get a public URL and LLM Playground access with </Text>
              <Text color="cyan" bold>
                --tunnel
              </Text>
              <Text>.</Text>
            </Box>
          )}
          {tunnelState.status === "starting" && (
            <Box>
              <Text>🌍{"  "}</Text>
              <Text color="yellow">{tunnelState.message}</Text>
            </Box>
          )}
          {tunnelState.status === "connected" && (
            <Box flexDirection="column" marginBottom={1}>
              <Box>
                <Text>🌍{"  "}</Text>
                <Text>Exposed on </Text>
                <Text color="green">{`${tunnelState.url}/mcp`}</Text>
              </Box>
              <Box>
                <Text color="#20a832">→{"  "}</Text>
                <Text color="white" bold>
                  Test with an LLM on Playground:{" "}
                </Text>
                <Text color="green">{`${tunnelState.url}/try`}</Text>
              </Box>
            </Box>
          )}
          {tunnelState.status === "error" && (
            <Box flexDirection="column" marginBottom={1}>
              <Box>
                <Text>🌍{"  "}</Text>
                <Text color="red">
                  Cannot open tunnel: {tunnelState.message}
                </Text>
              </Box>
              <Box>
                <Text color="#20a832">→{"  "}</Text>
                <Text color="red">{`Try manually: npx alpic tunnel --port ${port}`}</Text>
              </Box>
            </Box>
          )}

          <Box>
            <Text>🛟{"  "}</Text>
            <Text>Need help? Reach us on </Text>
            <Text color="white" underline>
              https://discord.alpic.ai
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
              {messages.map((message) => (
                <Box key={message.id} marginLeft={2}>
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

    // Note: `exitOnCtrlC: false` because we own SIGINT below to guarantee
    // alpic gets killed before we exit. If anything ever calls `useInput` or
    // puts stdin into raw mode, also wire an explicit `\x03` keypress to the
    // shutdown function — Ink will otherwise swallow Ctrl-C without ever
    // delivering SIGINT.
    const ink = render(<App />, { exitOnCtrlC: false, patchConsole: true });

    // Synchronous-first shutdown: kill the alpic subprocess up front so we
    // can't leave it orphaned even if another SIGINT listener (e.g. nodemon's)
    // exits the process before our async cleanup completes.
    const shutdown = (code: number) => () => {
      tunnelManager.stop();
      void closeTunnelControl()
        .catch((err) => {
          console.error("Failed to close tunnel control server", err);
        })
        .finally(() => {
          ink.unmount();
          process.exit(code);
        });
    };
    process.once("SIGINT", shutdown(130));
    process.once("SIGTERM", shutdown(143));
  }
}
