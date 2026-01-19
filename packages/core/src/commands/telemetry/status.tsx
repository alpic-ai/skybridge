import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { getMachineId, isEnabled } from "../../hooks/telemetry.js";

export default class TelemetryStatus extends Command {
  static override description = "Get Skybridge current telemetry settings for this machine";

  public async run(): Promise<void> {
    await this.parse(TelemetryStatus);
    const enabled = isEnabled();

    const App = () => (
      <Box flexDirection="column" padding={1}>
        <Text bold underline>
          Skybridge Telemetry
        </Text>

        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text>Status: </Text>
            {enabled ? (
              <Text color="green" bold>
                Enabled
              </Text>
            ) : (
              <Text color="yellow" bold>
                Disabled
              </Text>
            )}
          </Box>

          <Box marginTop={1}>
            <Text color="gray">Machine ID: </Text>
            <Text>{getMachineId()}</Text>
          </Box>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color="gray">To opt out, run: skybridge telemetry disable</Text>
          <Text color="gray">Or set: SKYBRIDGE_TELEMETRY_DISABLED=1</Text>
          <Text color="gray">Debug mode: SKYBRIDGE_TELEMETRY_DEBUG=1</Text>
        </Box>
      </Box>
    );

    render(<App />);
  }
}
