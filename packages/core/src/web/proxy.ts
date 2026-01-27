const colors = {
  brand: "#6366f1",
  info: "#22223b",
  success: "#22c55e",
  error: "#ef4444",
} as const;

export function installOpenAILoggingProxy() {
  if (typeof window === "undefined" || !window.openai) {
    return;
  }

  const descriptor = Object.getOwnPropertyDescriptor(window, "openai");
  if (descriptor?.configurable === false || descriptor?.writable === false) {
    console.warn(
      "[openai-proxy] window.openai is not configurable or writable, skipping proxy installation",
    );
    return;
  }

  const originalOpenAI = window.openai;

  const handler: ProxyHandler<typeof originalOpenAI> = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value !== "function") {
        return value;
      }

      return (...args: unknown[]) => {
        const methodName = String(prop);

        console.group(
          `%c[openai] %cmethod %c${methodName}`,
          `color: ${colors.brand}; font-weight: normal`,
          `color: ${colors.info}; font-weight: normal`,
          `color: ${colors.success}`,
        );
        console.log("%c← args:", `color: ${colors.info}`, args);

        const result = value.apply(target, args);

        if (result && typeof result.then === "function") {
          return result.then(
            (resolved: unknown) => {
              console.log(
                "%c→ resolved:",
                `color: ${colors.success}`,
                resolved,
              );
              console.groupEnd();
              return resolved;
            },
            (error: unknown) => {
              console.error("%c→ rejected:", `color: ${colors.error}`, error);
              console.groupEnd();
              throw error;
            },
          );
        }

        console.log("%c→ returned:", `color: ${colors.success}`, result);
        console.groupEnd();

        return result;
      };
    },

    set(target, prop, value, receiver) {
      console.log(
        `%c[openai] %cupdate %c${String(prop)}`,
        `color: ${colors.brand}`,
        `color: ${colors.info}`,
        `color: ${colors.success}; font-weight: bold`,
        "←",
        value,
      );

      return Reflect.set(target, prop, value, receiver);
    },
  };

  window.openai = new Proxy(originalOpenAI, handler);

  console.log(
    "%c[openai-proxy] %cInstalled logging proxy for window.openai",
    `color: ${colors.brand}`,
    `color: ${colors.info}`,
  );
}
