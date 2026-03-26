import { useState, useCallback } from "react";
import type { AnalyzeResponse } from "../services/api";
import { analyzeImage } from "../services/api";
import UploadSection from "../components/UploadSection";
import AnalysisPanel from "../components/AnalysisPanel";
import ImprovementsPanel from "../components/ImprovementsPanel";
import ImagePanel from "../components/ImagePanel";
import Loader from "../components/Loader";

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((selected: File) => {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResponse(null);
    setError(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await analyzeImage(file);
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [file]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Upload */}
      <div className="mb-8">
        <UploadSection
          onFileSelect={handleFileSelect}
          onAnalyze={handleAnalyze}
          previewUrl={previewUrl}
          hasFile={!!file}
          loading={loading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="animate-fade-in-up mb-8 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <p className="font-medium">Error</p>
          <p className="mt-1 opacity-80">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mb-8 flex justify-center">
          <Loader />
        </div>
      )}

      {/* Results */}
      {response && !loading && (
        <div className="space-y-8">
          {/* Analysis + Improvements row */}
          <div className="grid gap-6 md:grid-cols-2">
            <AnalysisPanel
              classification={response.classification}
              features={response.features}
              description={response.description}
            />
            <ImprovementsPanel improvements={response.improvements} />
          </div>

          {/* Generated Image */}
          {response.generated_image && (
            <ImagePanel base64={response.generated_image} />
          )}
        </div>
      )}
    </main>
  );
}
