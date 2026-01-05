export class IConfig {
  /**
   * Returns a valid value for the Authorization header.
   * Used to dynamically inject the current auth header.
   */
  getAccessToken?: () => string | undefined;
  refreshToken?: () => Promise<void>;
}


export class AuthenticatedHttpClient {
  private readonly config;

  constructor(config: IConfig) {
    this.config= config
  }

  async fetch(url: string, init: RequestInit): Promise<Response> {
    // Attach the current token
    console.log('test')
    init.headers = {
      ...init.headers,
      ...(this.config.getAccessToken() && { Authorization: `Bearer ${this.config.getAccessToken()}` }),
    };

    console.log("headers", init.headers);

    let response = await fetch(url, init);

    if (response.status === 401) {
      const refreshed = await this.config.refreshToken?.();
      if (refreshed) {
        // Retry the request with a new token
        init.headers = {
          ...init.headers,
          ...(this.config.getAccessToken() && { Authorization: `Bearer ${this.config.getAccessToken()}` }),
        };
        response = await fetch(url, init);
      }
    }

    return response;
  }
}
