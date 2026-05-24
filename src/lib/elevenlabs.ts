import { env } from "./env";

/**
 * ElevenLabs voice configuration shared with Vapi assistants.
 * Eureka doesn't synthesize TTS server-side — Vapi streams to ElevenLabs
 * directly during the call. We expose helpers to build the voice block
 * and to do server-side preview synthesis if needed.
 */
export function elevenLabsVoiceConfig() {
  return {
    provider: "11labs" as const,
    voiceId: env.elevenLabsVoiceId(),
    model: env.elevenLabsModel(),
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.3,
    useSpeakerBoost: true,
  };
}

/** Synthesize a one-off audio preview (e.g., for the dashboard). */
export async function previewSpeech(text: string): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${env.elevenLabsVoiceId()}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.elevenLabsKey(),
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: env.elevenLabsModel(),
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs preview failed: ${res.status}`);
  return res.arrayBuffer();
}
