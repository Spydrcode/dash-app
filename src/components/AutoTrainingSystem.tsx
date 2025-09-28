// Auto-Training Component - Automatically trains AI from existing uploaded data
'use client';

import { useEffect, useState } from 'react';

interface TrainingStats {
  total_records_processed: number;
  patterns_learned: number;
  rules_adapted: number;
  confidence_improved: boolean;
  successful_extractions: number;
  training_quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'INSUFFICIENT_DATA';
}

interface TrainingAssessment {
  total_screenshots: number;
  with_earnings_data: number;
  with_distance_data: number;
  high_quality_extractions: number;
  auto_training_readiness: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_MORE_DATA';
}

export default function AutoTrainingSystem() {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null);
  const [assessment, setAssessment] = useState<TrainingAssessment | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [lastTrainingTime, setLastTrainingTime] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Load training assessment on component mount
  useEffect(() => {
    loadTrainingAssessment();
  }, []);

  const loadTrainingAssessment = async () => {
    try {
      const response = await fetch('/api/auto-train');
      const data = await response.json();
      
      if (data.success) {
        setAssessment(data.assessment);
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Failed to load training assessment:', error);
      addLog('❌ Failed to load training assessment');
    }
  };

  const startAutoTraining = async () => {
    setIsTraining(true);
    setLogs([]);
    addLog('🤖 Starting auto-training from existing uploaded data...');
    
    try {
      const response = await fetch('/api/auto-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_train' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTrainingStats(result.stats);
        setRecommendations(result.recommendations);
        setLastTrainingTime(new Date().toLocaleString());
        
        addLog(`✅ Training completed! Processed ${result.stats.total_records_processed} records`);
        addLog(`🧠 Learned ${result.stats.patterns_learned} patterns`);
        addLog(`📊 Adapted ${result.stats.rules_adapted} validation rules`);
        addLog(`🎯 Training quality: ${result.stats.training_quality}`);
        
        // Reload assessment after training
        setTimeout(() => loadTrainingAssessment(), 1000);
      } else {
        addLog(`❌ Training failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Auto-training failed:', error);
      addLog('❌ Auto-training failed due to network error');
    } finally {
      setIsTraining(false);
    }
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const getReadinessColor = (readiness: string) => {
    switch (readiness) {
      case 'EXCELLENT': return 'text-green-600 bg-green-50 border-green-200';
      case 'GOOD': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'FAIR': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'EXCELLENT': return 'text-green-600';
      case 'GOOD': return 'text-blue-600';
      case 'FAIR': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🤖 Auto-Training System
        </h1>
        <p className="text-gray-600">
          Automatically train your AI agents using the data you've already uploaded. 
          No manual corrections needed!
        </p>
      </div>

      {/* Training Assessment */}
      {assessment && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Training Data Assessment</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{assessment.total_screenshots}</div>
              <div className="text-sm text-gray-600">Total Screenshots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{assessment.with_earnings_data}</div>
              <div className="text-sm text-gray-600">With Earnings Data</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assessment.with_distance_data}</div>
              <div className="text-sm text-gray-600">With Distance Data</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{assessment.high_quality_extractions}</div>
              <div className="text-sm text-gray-600">High Quality</div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${getReadinessColor(assessment.auto_training_readiness)}`}>
            <div className="font-semibold mb-2">
              Training Readiness: {assessment.auto_training_readiness}
            </div>
            <div className="text-sm">
              {assessment.auto_training_readiness === 'EXCELLENT' && 
                '🎉 Perfect! Your data is ideal for auto-training.'}
              {assessment.auto_training_readiness === 'GOOD' && 
                '✅ Good data quality. Auto-training will work well.'}
              {assessment.auto_training_readiness === 'FAIR' && 
                '⚠️ Moderate data quality. Training will help but may need more data.'}
              {assessment.auto_training_readiness === 'NEEDS_MORE_DATA' && 
                '📸 Upload more screenshots to improve training effectiveness.'}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Training Controls */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">🚀 Auto-Training</h2>
          {lastTrainingTime && (
            <div className="text-sm text-gray-500">
              Last trained: {lastTrainingTime}
            </div>
          )}
        </div>

        <div className="mb-6">
          <button
            onClick={startAutoTraining}
            disabled={isTraining || !assessment || assessment.total_screenshots < 5}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              isTraining 
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : assessment && assessment.total_screenshots >= 5
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isTraining ? '🔄 Training in Progress...' : '🤖 Start Auto-Training'}
          </button>
          
          {assessment && assessment.total_screenshots < 5 && (
            <p className="text-sm text-red-600 mt-2">
              Need at least 5 screenshots to start auto-training
            </p>
          )}
        </div>

        {/* Training Results */}
        {trainingStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">{trainingStats.total_records_processed}</div>
              <div className="text-sm text-gray-600">Records Processed</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{trainingStats.patterns_learned}</div>
              <div className="text-sm text-gray-600">Patterns Learned</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{trainingStats.rules_adapted}</div>
              <div className="text-sm text-gray-600">Rules Adapted</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className={`text-2xl font-bold ${getQualityColor(trainingStats.training_quality)}`}>
                {trainingStats.training_quality}
              </div>
              <div className="text-sm text-gray-600">Quality</div>
            </div>
          </div>
        )}

        {/* Training Logs */}
        {logs.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">📝 Training Logs</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Recommendations</h3>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-blue-800 text-sm flex items-start">
                <span className="mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">🔧 How Auto-Training Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-4 rounded-lg">
            <div className="font-semibold text-blue-600 mb-2">1. Pattern Recognition</div>
            <div className="text-gray-700">
              Analyzes your successful data extractions to learn patterns specific to your rideshare app layouts
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="font-semibold text-green-600 mb-2">2. Rule Adaptation</div>
            <div className="text-gray-700">
              Adjusts validation rules based on YOUR actual driving patterns (max earnings, trip counts, etc.)
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="font-semibold text-purple-600 mb-2">3. Accuracy Improvement</div>
            <div className="text-gray-700">
              Applies learned patterns to improve future OCR extractions and performance calculations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}