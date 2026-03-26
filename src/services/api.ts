export interface AnalyzeResponse {
  classification: string;
  features: string[];
  description: string;
  improvements: string[];
  generated_image: string;
}

export async function analyzeImage(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/analyze", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Analysis failed (${res.status}): ${text || res.statusText}`
    );
  }

  return res.json();
}
