export default {
  model: {
    baseURL: "https://api.anthropic.com/v1/",
    name: "claude-haiku-4-5",
    apiKeyEnv: "ANTHROPIC_API_KEY",
  },
  project: {
    cwd: "../../examples/flight-booking",
    command: ["./node_modules/.bin/tsx", "src/server.ts"],
    env: {},
  },
};
