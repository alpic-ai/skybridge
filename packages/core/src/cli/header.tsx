import { Box, Text } from "ink";

export const Header = ({
  version,
  children,
}: {
  version: string;
  children?: React.ReactNode;
}) => {
  return (
    <Box marginBottom={1}>
      <Text color="cyan" bold>
        ⛰{"  "}Skybridge
      </Text>
      <Text color="cyan"> v{version}</Text>
      {children}
    </Box>
  );
};
