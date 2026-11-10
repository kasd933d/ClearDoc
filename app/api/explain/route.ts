
import { NextResponse } from "next/server";
export const maxDuration = 60;


export async function POST(req: Request) {
  try {
    const { image, mimeType, language } = await req.json();

    if (!image || !mimeType || !language) {
      return NextResponse.json({ error: "Missing photo or language." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    // Pehle main model, phir backup model (dono .env.local se aate hain)
    const models = [process.env.GEMINI_MODEL, process.env.GEMINI_FALLBACK_MODEL].filter(
      Boolean
    ) as string[];

    if (!apiKey || models.length === 0) {
      return NextResponse.json(
        { error: "Server is not set up yet (missing key or model)." },
        { status: 500 }
      );
    }

    const prompt = `You help people with low literacy understand official documents such as bills, notices, forms and reports.
Look at the document in the file. Return ONLY valid JSON in exactly this shape:
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

    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: image } },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    });

    let lastStatus = 0;

    // Har model ko baari baari try karo, jo pehle jawab de wahi jeeta
    for (const model of models) {
      try {
        console.log("explain: trying model", model);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body,
            signal: AbortSignal.timeout(25000),
          }
        );

        if (!res.ok) {
          lastStatus = res.status;
          console.error("Gemini error:", model, res.status, await res.text());
          continue; // agle model par jao
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastStatus = 502;
          console.error("Gemini gave an empty answer:", model);
          continue;
        }

        return NextResponse.json(JSON.parse(text));
      } catch (err) {
        lastStatus = err instanceof Error && err.name === "TimeoutError" ? 504 : 502;
        console.error("explain: model failed:", model, err);
      }
    }

    // Saare models fail ho gaye: user ko saaf message dikhao
    if (lastStatus === 429) {
      return NextResponse.json(
        { error: "Too many requests right now. Please wait a minute and try again." },
        { status: 429 }
      );
    }
    if (lastStatus === 503 || lastStatus === 504) {
      return NextResponse.json(
        { error: "The AI is busy right now. Please try again in a moment." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: `The AI service had a problem (code ${lastStatus}). Please try again.` },
      { status: 502 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}