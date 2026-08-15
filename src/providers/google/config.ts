export type GoogleProviderConfig = {
  readonly apiKey: string;
  readonly textModel: string;
  readonly imageModel: string;
  readonly speechModel: string;
  readonly projectRoot: string;
  readonly assetDirectory: string;
  readonly apiBaseUrl: string;
};

export const loadGoogleProviderConfig = (
  env: Record<string, string | undefined> = process.env,
): GoogleProviderConfig => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required for Google providers');

  return {
    apiKey,
    textModel: env.GEMINI_TEXT_MODEL ?? 'gemini-3.5-flash',
    imageModel: env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image',
    speechModel: env.GEMINI_SPEECH_MODEL ?? 'gemini-3.1-flash-tts-preview',
    projectRoot: env.VIDEO_FACTORY_PROJECT_ROOT ?? './projects',
    assetDirectory: env.GEMINI_ASSET_DIRECTORY ?? 'assets/google',
    apiBaseUrl: env.GEMINI_API_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta',
  };
};

export const redactSecret = (value: string): string => {
  if (value.length <= 8) return '[REDACTED]';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
};

export const redactGoogleConfig = (config: GoogleProviderConfig): Omit<GoogleProviderConfig, 'apiKey'> & {readonly apiKey: string} => ({
  ...config,
  apiKey: redactSecret(config.apiKey),
});
