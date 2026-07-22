export class IConfig {
  /**
   * Returns a valid value for the Authorization header.
   * Used to dynamically inject the current auth header.
   */
  getAccessToken?: () => string | undefined;
  /**
   * Attempts to refresh the access token.
   * Returns true if the token was successfully refreshed, false otherwise.
   */
  refreshToken?: () => Promise<boolean>;
}


export class AuthenticatedHttpClient {
  private readonly config;

  constructor(config: IConfig) {
    this.config = config;
  }

  async fetch(url: string, init: RequestInit): Promise<Response> {
    // Attach the current token
    // getAccessToken is optional on IConfig, so guard the call rather than invoking it unconditionally.
    const token = this.config.getAccessToken?.();
    init.headers = {
      ...init.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    let response = await fetch(url, init);

    if (response.status === 401 && this.config.refreshToken) {
      const refreshed = await this.config.refreshToken();
      if (refreshed) {
        // Retry the request with the new token
        const newToken = this.config.getAccessToken?.();
        init.headers = {
          ...init.headers,
          ...(newToken && { Authorization: `Bearer ${newToken}` }),
        };
        response = await fetch(url, init);
      }
    }

    return response;
  }
}
