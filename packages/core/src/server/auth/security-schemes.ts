import type { AuthInfo } from "../auth.js";
import { hostFromUserAgent } from "../host.js";
import type { SecurityScheme, ToolAuth } from "../server.js";

export function authToSecuritySchemes(auth: ToolAuth): SecurityScheme[] {
  const oauth2: SecurityScheme = {
    type: "oauth2",
    ...(auth.scopes?.length ? { scopes: auth.scopes } : {}),
  };
  return auth.allowsAnonymous ? [{ type: "noauth" }, oauth2] : [oauth2];
}

export function securitySchemesAllowAnonymous(
  schemes: SecurityScheme[] | undefined,
): boolean {
  return !!schemes?.some((scheme) => scheme.type === "noauth");
}

export type SchemeFailure = {
  error: "invalid_token" | "insufficient_scope";
  description: string;
  scopes: string[];
};

export function evaluateSecuritySchemes(
  schemes: SecurityScheme[] | undefined,
  authInfo: AuthInfo | undefined,
): SchemeFailure | undefined {
  if (securitySchemesAllowAnonymous(schemes) && !authInfo) {
    return undefined;
  }
  const oauth2 = (schemes ?? []).filter((scheme) => scheme.type === "oauth2");
  const required = oauth2.length ? oauth2 : [{ type: "oauth2" as const }];
  const scopes = [
    ...new Set(required.flatMap((scheme) => scheme.scopes ?? [])),
  ];
  if (!authInfo) {
    return {
      error: "invalid_token",
      description: "Sign in to use this tool.",
      scopes,
    };
  }
  const satisfied = required.some((scheme) =>
    (scheme.scopes ?? []).every((scope) => authInfo.scopes.includes(scope)),
  );
  return satisfied
    ? undefined
    : {
        error: "insufficient_scope",
        description: "Missing required scope for this tool.",
        scopes,
      };
}

export function httpStatusForFailure(failure: SchemeFailure): 401 | 403 {
  return failure.error === "insufficient_scope" ? 403 : 401;
}

export function clientPrefersInBandChallenge(
  userAgent: string | undefined,
): boolean {
  return hostFromUserAgent(userAgent) === "openai";
}

export function wwwAuthenticateHeader(
  failure: SchemeFailure,
  resourceMetadataUrl?: string,
): string {
  let header = `Bearer error="${failure.error}", error_description="${failure.description}"`;
  if (failure.scopes.length) {
    header += `, scope="${failure.scopes.join(" ")}"`;
  }
  if (resourceMetadataUrl) {
    header += `, resource_metadata="${resourceMetadataUrl}"`;
  }
  return header;
}

export function inBandChallengeResult(
  failure: SchemeFailure,
  resourceMetadataUrl?: string,
) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: failure.description }],
    _meta: {
      "mcp/www_authenticate": [
        wwwAuthenticateHeader(failure, resourceMetadataUrl),
      ],
    },
  };
}
