const isValidPort = (value: number): boolean =>
    Number.isInteger(value) && value >= 0 && value <= 65_535;

export const resolvePort = (
    flagPort: number | undefined,
    envPort: string | undefined,
    fallbackPort: number,
): number => {
  if (typeof flagPort === "number" && isValidPort(flagPort)) {
    return flagPort;
  }

  if (typeof envPort === "string") {
    const parsedPort = Number.parseInt(envPort, 10);

    if (isValidPort(parsedPort)) {
      return parsedPort;
    }
  }

  if (!isValidPort(fallbackPort)) {
    throw new Error(`Invalid fallbackPort value: ${fallbackPort}`);
  }

  return fallbackPort;
};
