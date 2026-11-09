
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { image, mimeType, language } = await req.json();

    if (!image || !mimeType || !language) {
      return NextResponse.json(
        { error: "Missing photo or language." },
        { status: 400 }
      );
    }

    const apiKey = process.env.AI_API_KEY;

    const baseUrl = (
      process.env.AI_BASE_URL || "https://api.x.ai/v1"
    ).replace(/\/$/, "");

    const models = [
      process.env.AI_MODEL,
      process.env.AI_FALLBACK_MODEL,
    ].filter(Boolean) as string[];

    if (!apiKey || models.length === 0) {
      return NextResponse.json(
        { error: "Server is not set up yet (missing key or model)." },
        { status: 500 }
      );
    }

    const prompt = `You help people with low literacy understand official documents such as bills, notices, forms and reports.

Look at the document in the image. Return ONLY valid JSON in exactly this shape:

{
  "doc_type": "what kind of document this is, in 2-4 words",
  "summary": "4 to 6 short, simple sentences: who it is from, what it is about, and what matters most",
  "key_details": [{"label": "...", "value": "..."}],
  "actions": ["step 1", "step 2"],
  "warning": "any deadline, penalty or risk, or an empty string if none"
}

Rules:
- key_details: list the 5 to 10 most important facts exactly as written in the document (names, amounts, due dates, account or reference numbers, addresses, contact details). Never invent facts.
- actions: include ONLY steps that the document really asks the person to do. If nothing is required, return an empty list [].
- Write all the values in ${language}. Keep the JSON keys in English.
- Use everyday words. Avoid legal and technical terms.
- If the file is not readable or is not a document, say so politely in "summary" and leave the other fields empty.
- Do not give legal or medical advice. For serious matters, tell the person to ask a professional.`;

    let lastStatus = 0;

    for (const model of models) {
      try {
        console.log("explain: trying Grok model", model);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        let res: Response;

        try {
          res = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: prompt,
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${mimeType};base64,${image}`,
                      },
                    },
                  ],
                },
              ],
              temperature: 0.2,
              response_format: {
                type: "json_object",
              },
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (!res.ok) {
          lastStatus = res.status;

          console.error(
            "Grok error:",
            model,
            res.status,
            await res.text()
          );

          continue;
        }

        const data = await res.json();

        const text = data.choices?.[0]?.message?.content;

        if (!text) {
          lastStatus = 502;
          console.error("Grok gave an empty answer:", model);
          continue;
        }

        const result = JSON.parse(text);

        return NextResponse.json(result);
      } catch (err) {
        lastStatus =
          err instanceof Error && err.name === "AbortError"
            ? 504
            : 502;

        console.error("explain: Grok model failed:", model, err);
      }
    }

    if (lastStatus === 429) {
      return NextResponse.json(
        {
          error:
            "Too many requests right now. Please wait a minute and try again.",
        },
        { status: 429 }
      );
    }

    if (lastStatus === 503 || lastStatus === 504) {
      return NextResponse.json(
        {
          error:
            "The AI is busy right now. Please try again in a moment.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: `The AI service had a problem (code ${lastStatus}). Please try again.`,
      },
      { status: 502 }
    );
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
