import type {GoogleProviderConfig} from './config';

export type GoogleProviderErrorCode =
  | 'GOOGLE_AUTH_FAILED'
  | 'GOOGLE_RATE_LIMITED'
  | 'GOOGLE_UNAVAILABLE'
  | 'GOOGLE_REQUEST_FAILED';

export class GoogleProviderError extends Error {
  readonly retryable: boolean;

  constructor(
    readonly code: GoogleProviderErrorCode,
    message: string,
    retryable = false,
  ) {
    super(message);
    this.name = 'GoogleProviderError';
    this.retryable = retryable;
  }
}

type GoogleClientOptions = {
  readonly fetchImpl?: typeof fetch;
};

type GenerateContentResponse = {
  readonly candidates?: readonly {
    readonly content?: {readonly parts?: readonly {readonly text?: string; readonly inlineData?: {readonly data?: string; readonly mimeType?: string}}[]};
  }[];
};

const responseMessage = (status: number): string => {
  if (status === 401 || status === 403) return 'Google provider authentication failed.';
  if (status === 429) return 'Google provider rate limit reached.';
  if (status >= 500) return 'Google provider is temporarily unavailable.';
  return 'Google provider request failed.';
};

const responseCode = (status: number): GoogleProviderErrorCode => {
  if (status === 401 || status === 403) return 'GOOGLE_AUTH_FAILED';
  if (status === 429) return 'GOOGLE_RATE_LIMITED';
  if (status >= 500 || status === 408) return 'GOOGLE_UNAVAILABLE';
  return 'GOOGLE_REQUEST_FAILED';
};

export class GoogleGenerativeClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: GoogleProviderConfig, options: GoogleClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateContent(model: string, body: unknown): Promise<GenerateContentResponse> {
    const url = `${this.config.apiBaseUrl}/models/${encodeURIComponent(model)}:generateContent`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new GoogleProviderError('GOOGLE_UNAVAILABLE', 'Google provider network request failed.', true);
    }

    if (!response.ok) {
      const code = responseCode(response.status);
      throw new GoogleProviderError(code, responseMessage(response.status), code === 'GOOGLE_RATE_LIMITED' || code === 'GOOGLE_UNAVAILABLE');
    }

    try {
      return (await response.json()) as GenerateContentResponse;
    } catch {
      throw new GoogleProviderError('GOOGLE_REQUEST_FAILED', 'Google provider returned invalid JSON.');
    }
  }
}

export const stageRunErrorCode = (stage: 'text' | 'image' | 'tts', error: unknown): string => {
  if (error instanceof GoogleProviderError) return `${stage.toUpperCase()}_${error.code}`;
  return `${stage.toUpperCase()}_PROVIDER_FAILED`;
};
