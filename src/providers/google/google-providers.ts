import {mkdir, writeFile} from 'node:fs/promises';
import {relative, resolve, sep} from 'node:path';
import {hashValue, sha256} from '../../domain/foundation/ids';
import type {
  ImageGenerationCapability,
  ImageGenerationRequest,
  ImageGenerationResult,
  SpeechSynthesisCapability,
  SpeechSynthesisRequest,
  SpeechSynthesisResult,
  TextGenerationCapability,
  TextGenerationRequest,
  TextGenerationResult,
} from '../../domain/foundation';
import {GoogleGenerativeClient} from './client';
import type {GoogleProviderConfig} from './config';

const ensureWithinRoot = (root: string, relativePath: string): string => {
  if (relativePath.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(relativePath)) {
    throw new Error('Google provider output path must be project-relative');
  }
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(absoluteRoot, relativePath);
  if (absolutePath !== absoluteRoot && !absolutePath.startsWith(`${absoluteRoot}${sep}`)) {
    throw new Error('Google provider output path escapes project root');
  }
  return absolutePath;
};

const imageDimensions = (data: Uint8Array): {readonly width: number; readonly height: number} => {
  if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return {
      width: new DataView(data.buffer, data.byteOffset).getUint32(16),
      height: new DataView(data.buffer, data.byteOffset).getUint32(20),
    };
  }
  throw new Error('Google image response is not a supported PNG asset');
};

type SupportedPcmFormat = {
  readonly mimeType: 'audio/L16';
  readonly sampleRate: 24000;
  readonly channels: 1;
  readonly bitDepth: 16;
};

const SUPPORTED_PCM_FORMAT: SupportedPcmFormat = {
  mimeType: 'audio/L16',
  sampleRate: 24000,
  channels: 1,
  bitDepth: 16,
};

const validatePcmFormat = (mimeType: string | undefined): SupportedPcmFormat => {
  const match = /^audio\/L16\s*;\s*rate=(\d+)\s*$/iu.exec(mimeType ?? '');
  if (!match || Number(match[1]) !== SUPPORTED_PCM_FORMAT.sampleRate) {
    throw new Error('Google speech provider returned unsupported PCM format; expected audio/L16 at 24000 Hz');
  }
  return SUPPORTED_PCM_FORMAT;
};

const wavFromPcm = (pcm: Uint8Array, format: SupportedPcmFormat): Uint8Array => {
  if (pcm.byteLength % (format.channels * (format.bitDepth / 8)) !== 0) {
    throw new Error('Google speech provider returned truncated PCM data');
  }
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeAscii = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, format.channels, true);
  view.setUint32(24, format.sampleRate, true);
  view.setUint32(28, format.sampleRate * format.channels * (format.bitDepth / 8), true);
  view.setUint16(32, format.channels * (format.bitDepth / 8), true);
  view.setUint16(34, format.bitDepth, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  return new Uint8Array([...new Uint8Array(header), ...pcm]);
};

const writeAsset = async (config: GoogleProviderConfig, filename: string, data: Uint8Array): Promise<string> => {
  const projectRelativePath = `${config.assetDirectory}/${filename}`.replace(/\\/gu, '/');
  const absolutePath = ensureWithinRoot(config.projectRoot, projectRelativePath);
  await mkdir(resolve(absolutePath, '..'), {recursive: true});
  await writeFile(absolutePath, data);
  return projectRelativePath;
};

const createClient = (config: GoogleProviderConfig, fetchImpl?: typeof fetch): GoogleGenerativeClient =>
  new GoogleGenerativeClient(config, {fetchImpl});

export const createGoogleTextProvider = (config: GoogleProviderConfig, fetchImpl?: typeof fetch): TextGenerationCapability => ({
  kind: 'text',
  providerId: 'google-gemini-text-v1',
  async generate(request: TextGenerationRequest): Promise<TextGenerationResult> {
    const response = await createClient(config, fetchImpl).generateContent(config.textModel, {
      contents: [{parts: [{text: request.prompt}]}],
    });
    const text = response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []).map((part) => part.text).find((value) => value);
    if (!text) throw new Error('Google text provider returned no text output');
    return {
      text,
      metadata: {provider: 'google', model: config.textModel, requestHash: hashValue(request)},
    };
  },
});

export const createGoogleImageProvider = (config: GoogleProviderConfig, fetchImpl?: typeof fetch): ImageGenerationCapability => ({
  kind: 'image',
  providerId: 'google-gemini-image-v1',
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const response = await createClient(config, fetchImpl).generateContent(config.imageModel, {
      contents: [{parts: [{text: request.prompt}]}],
      generationConfig: {responseModalities: ['IMAGE']},
    });
    const inlineData = response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []).map((part) => part.inlineData).find((value) => value?.data);
    if (!inlineData?.data) throw new Error('Google image provider returned no image output');
    const data = Buffer.from(inlineData.data, 'base64');
    const dimensions = imageDimensions(data);
    const identity = hashValue({request, provider: 'google', model: config.imageModel, contentHash: sha256(data)}).slice(0, 24);
    const localPath = await writeAsset(config, `google-image_${identity}.png`, data);
    return {
      localPath,
      contentHash: sha256(data),
      width: dimensions.width,
      height: dimensions.height,
      metadata: {provider: 'google', model: config.imageModel, requestHash: hashValue(request)},
    };
  },
});

export const createGoogleSpeechProvider = (config: GoogleProviderConfig, fetchImpl?: typeof fetch): SpeechSynthesisCapability => ({
  kind: 'speech',
  providerId: 'google-gemini-tts-v1',
  async synthesize(request: SpeechSynthesisRequest): Promise<SpeechSynthesisResult> {
    const response = await createClient(config, fetchImpl).generateContent(config.speechModel, {
      contents: [{parts: [{text: request.text}]}],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: request.voice}}},
      },
    });
    const inlineData = response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []).map((part) => part.inlineData).find((value) => value?.data);
    if (!inlineData?.data) throw new Error('Google speech provider returned no audio output');
    const format = validatePcmFormat(inlineData.mimeType);
    const pcm = Buffer.from(inlineData.data, 'base64');
    const wav = wavFromPcm(pcm, format);
    const contentHash = sha256(wav);
    const identity = hashValue({request, provider: 'google', model: config.speechModel, contentHash}).slice(0, 24);
    const localPath = await writeAsset(config, `google-speech_${identity}.wav`, wav);
    return {
      localPath,
      durationMs: Math.round((pcm.byteLength / (format.sampleRate * format.channels * (format.bitDepth / 8))) * 1000),
      metadata: {
        provider: 'google',
        model: config.speechModel,
        requestHash: hashValue(request),
        voice: request.voice,
        language: request.language,
        synthesisParameters: {
          responseModality: 'AUDIO',
          voice: request.voice,
          language: request.language,
          audioMimeType: format.mimeType,
          sampleRate: format.sampleRate,
          channels: format.channels,
          bitDepth: format.bitDepth,
        },
      },
    };
  },
});

export const isProjectRelativePath = (projectRoot: string, localPath: string): boolean => {
  const absoluteRoot = resolve(projectRoot);
  const absolutePath = resolve(absoluteRoot, localPath);
  return relative(absoluteRoot, absolutePath) === localPath.replace(/\\/gu, '/') && !absolutePath.startsWith(`${absoluteRoot}${sep}..${sep}`);
};
