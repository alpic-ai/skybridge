import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { setEnabled } from "../../hooks/telemetry.js";

export default class TelemetryEnable extends Command {
  static override description = "Enable Skybridge telemetry";

  public async run(): Promise<void> {
    await this.parse(TelemetryEnable);
    setEnabled(true);

    const App = () => (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">✓</Text>
          <Text> Telemetry has been </Text>
          <Text color="green" bold>
            enabled
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Config saved to ~/.skybridge/config.json</Text>
        </Box>
      </Box>
    );

    render(<App />);
  }
}
