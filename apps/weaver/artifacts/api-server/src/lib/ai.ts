import { z } from "zod/v4";
import { openai } from "@workspace/integrations-openai-ai-server";
import { designProfileSchema } from "./profile-schema";
import { unprocessable } from "./http-error";

const MODEL = "gpt-5.6-terra";

const PROFILE_JSON_SPEC = `Return ONLY a JSON object (no markdown fences, no commentary) with this exact shape:
{
  "name": "short human-readable name for this design source",
  "summary": "2-4 sentences describing the design language you extracted and the strongest evidence for it",
  "profile": {
    "colors": {
      "primary": "#rrggbb", "background": "#rrggbb", "text": "#rrggbb",
      "secondary": "#rrggbb or null", "accent": "#rrggbb or null", "surface": "#rrggbb or null",
      "muted": "#rrggbb or null", "border": "#rrggbb or null",
      "success": "#rrggbb or null", "warning": "#rrggbb or null", "danger": "#rrggbb or null",
      "palette": [{ "name": "string", "hex": "#rrggbb", "role": "optional role like brand/neutral/feedback" }]
    },
    "typography": {
      "headingFont": "font family name", "bodyFont": "font family name", "monoFont": "font family name or null",
      "baseSizePx": 16, "scaleRatio": 1.25, "headingWeight": 600, "bodyWeight": 400
    },
    "spacing": { "basePx": 4, "density": "compact|comfortable|spacious" },
    "radius": { "basePx": 8, "style": "sharp|subtle|rounded|pill" },
    "shadows": { "style": "none|subtle|elevated|dramatic" },
    "tone": { "summary": "one sentence on the personality", "descriptors": ["3-8", "short", "adjectives"] }
  }
}
Rules:
- Hex colors must be 6-digit lowercase. Fonts must be plausible real font family names (e.g. "Inter", "IBM Plex Sans").
- "primary" is the dominant brand/action color; "background" is the app canvas color; "text" is the main foreground.
- Ground every value in the evidence. Where evidence is silent, infer the most consistent tasteful value — never a random one.
- palette lists up to 12 of the most notable source colors with human names.
- radius.basePx 0-32, spacing.basePx 2-16, baseSizePx 10-24, scaleRatio 1.05-1.8.`;

const envelopeSchema = z.object({
  name: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  profile: designProfileSchema,
});

export type AiProfileResult = z.infer<typeof envelopeSchema>;

function extractJsonObject(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object in response");
  return body.slice(start, end + 1);
}

async function chatJson(messages: { role: "system" | "user"; content: string }[]): Promise<string> {
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
    });
    return res.choices[0]?.message?.content ?? "";
  } catch {
    // Some gateways reject response_format — retry without it.
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_completion_tokens: 8192,
    });
    return res.choices[0]?.message?.content ?? "";
  }
}

/**
 * Ask the model to distill a design profile from source evidence.
 * Throws 422 if a valid profile cannot be produced after a retry — analysis failures are explicit.
 */
export async function composeProfile(instructions: string, evidence: string): Promise<AiProfileResult> {
  const baseMessages: { role: "system" | "user"; content: string }[] = [
    {
      role: "system",
      content:
        "You are a senior design-systems engineer. You distill design sources (specs, Figma files, codebases) into precise, structured design profiles. You are rigorous about grounding values in evidence.",
    },
    {
      role: "user",
      content: `${instructions}\n\n${PROFILE_JSON_SPEC}\n\n=== EVIDENCE ===\n${evidence}`,
    },
  ];

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages =
      attempt === 0
        ? baseMessages
        : [
            ...baseMessages,
            {
              role: "user" as const,
              content: `Your previous response was invalid (${lastError}). Respond again with ONLY the corrected JSON object.`,
            },
          ];
    let raw: string;
    try {
      raw = await chatJson(messages);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      continue;
    }
    try {
      const parsed = envelopeSchema.parse(JSON.parse(extractJsonObject(raw)));
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err.message.slice(0, 400) : String(err);
    }
  }
  throw unprocessable(`AI analysis could not produce a valid design profile: ${lastError}`);
}

/**
 * Generate human mapping notes for a completed generation.
 * Returns null on any failure — callers fall back to deterministic notes.
 */
export async function mappingNotes(args: {
  systemName: string;
  organization: string;
  themingFormat: string;
  profileJson: string;
  fileList: string[];
}): Promise<string | null> {
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a design-systems engineer writing concise handoff notes. Plain text with short paragraphs and '-' bullet lists only. No markdown headings, no emojis.",
        },
        {
          role: "user",
          content: `A design profile was translated into a theme package for ${args.systemName} (${args.organization}), which is themed via: ${args.themingFormat}.\n\nDesign profile JSON:\n${args.profileJson}\n\nGenerated files:\n${args.fileList.join("\n")}\n\nWrite 120-220 words of mapping notes: how the profile's colors/typography/spacing/radius/shadows were mapped onto this system's token model, which decisions involved judgment calls, and 2-3 bullet points on how to install/apply the files. Refer to concrete token names used by this system.`,
        },
      ],
      max_completion_tokens: 2048,
    });
    const text = res.choices[0]?.message?.content?.trim();
    return text && text.length > 40 ? text : null;
  } catch {
    return null;
  }
}
