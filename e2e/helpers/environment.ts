const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost']);

export function requireLoopbackUrl(value: string, variableName: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid URL.`);
  }

  if (!loopbackHosts.has(url.hostname)) {
    throw new Error(
      `${variableName} must target disposable local infrastructure; received ${url.hostname}.`,
    );
  }

  return url;
}
