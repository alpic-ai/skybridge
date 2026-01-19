import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { setEnabled } from "../../cli/telemetry.js";

export default class TelemetryDisable extends Command {
  static override description = "Disable Skybridge telemetry on this machine";

  public async run(): Promise<void> {
    await this.parse(TelemetryDisable);
    setEnabled(false);

    const App = () => (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="yellow">✓</Text>
          <Text> Telemetry has been </Text>
          <Text color="yellow" bold>
            disabled
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Config saved to ~/.skybridge/config.json</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">
            Skybridge never collects Personally Identifiable Information (PII).
            If you'd like to help us improve Skybridge by allowing anonymous CLI
            usage data, please reenable telemetry with: skybridge telemetry
            enable
          </Text>
        </Box>
      </Box>
    );

    render(<App />);
  }
}
