'use client';

import { useState } from 'react';

interface AnalysisScores {
  TOXICITY: number;
  SEVERE_TOXICITY: number;
  IDENTITY_ATTACK: number;
  INSULT: number;
  PROFANITY: number;
  THREAT: number;
  SEXUALLY_EXPLICIT?: number;
  FLIRTATION?: number;
}

interface AnalysisResult {
  scores: AnalysisScores;
  languages: string[];
  detectedLanguages?: string[];
}

export default function CommunityPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze text');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number): string => {
    return (score * 100).toFixed(2);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.7) return 'text-red-600 dark:text-red-400';
    if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getScoreBarColor = (score: number): string => {
    if (score >= 0.7) return 'bg-red-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.7) return 'High Risk';
    if (score >= 0.4) return 'Moderate Risk';
    return 'Low Risk';
  };

  const attributeLabels: { [key: string]: string } = {
    TOXICITY: 'Toxicity',
    SEVERE_TOXICITY: 'Severe Toxicity',
    IDENTITY_ATTACK: 'Identity Attack',
    INSULT: 'Insult',
    PROFANITY: 'Profanity',
    THREAT: 'Threat',
    SEXUALLY_EXPLICIT: 'Sexually Explicit',
    FLIRTATION: 'Flirtation',
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Text Moderation Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Analyze text for offensive or harmful content using Google&apos;s Perspective API
          </p>

          <div className="space-y-6">
            {/* Text Input */}
            <div>
              <label
                htmlFor="text-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Enter text to analyze
              </label>
              <textarea
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste text here to check for offensive content..."
                className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-zinc-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         resize-none placeholder-gray-400 dark:placeholder-gray-500"
                disabled={loading}
              />
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {text.length} characters
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 
                       disabled:bg-gray-400 disabled:cursor-not-allowed
                       text-white font-medium rounded-lg transition-colors
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? 'Analyzing...' : 'Analyze Text'}
            </button>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="mt-8 space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Analysis Results
                </h2>

                {/* Overall Summary */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Languages detected:</strong>{' '}
                    {results.languages?.join(', ') || 'Not specified'}
                  </p>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(results.scores).map(([key, value]) => (
                    <div
                      key={key}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                               bg-gray-50 dark:bg-zinc-800"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {attributeLabels[key] || key}
                        </h3>
                        <span className={`text-lg font-bold ${getScoreColor(value)}`}>
                          {formatScore(value)}%
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getScoreBarColor(value)}`}
                          style={{ width: `${value * 100}%` }}
                        />
                      </div>
                      
                      <p className={`text-xs font-medium ${getScoreColor(value)}`}>
                        {getScoreLabel(value)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Interpretation */}
                <div className="p-4 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    How to interpret these scores:
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>
                      <strong>0-40%:</strong> Low risk - Content appears to be safe
                    </li>
                    <li>
                      <strong>40-70%:</strong> Moderate risk - Content may contain questionable language
                    </li>
                    <li>
                      <strong>70-100%:</strong> High risk - Content likely contains offensive or harmful language
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}