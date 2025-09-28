// User Feedback System for AI Training
// Allows manual corrections to train the AI agents on YOUR specific data patterns

import { useEffect, useState } from 'react';
import { AITrainingSystem } from '../lib/ai-training-system';

interface ScreenshotReview {
  id: string;
  image_url: string;
  extracted_data: any;
  ocr_text: string;
  screenshot_type: string;
  confidence: number;
  needs_review: boolean;
}

interface CorrectionData {
  screenshot_id: string;
  field: string;
  extracted_value: any;
  corrected_value: any;
  user_notes?: string;
}

export default function AITrainingDashboard() {
  const [screenshots, setScreenshots] = useState<ScreenshotReview[]>([]);
  const [corrections, setCorrections] = useState<CorrectionData[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotReview | null>(null);
  const [aiTrainer] = useState(() => new AITrainingSystem());

  // Load screenshots that need review (low confidence extractions)
  useEffect(() => {
    loadScreenshotsForReview();
  }, []);

  const loadScreenshotsForReview = async () => {
    try {
      const response = await fetch('/api/screenshots-for-review');
      const data = await response.json();
      
      // Filter for screenshots with low confidence or missing data
      const needsReview = data.screenshots.filter((s: any) => 
        s.extraction_confidence < 0.8 || 
        !s.extracted_data.driver_earnings ||
        !s.extracted_data.distance
      );
      
      setScreenshots(needsReview);
    } catch (error) {
      console.error('Failed to load screenshots for review:', error);
    }
  };

  const submitCorrection = async (correction: CorrectionData) => {
    try {
      // Record the correction for AI training
      const screenshot = screenshots.find(s => s.id === correction.screenshot_id);
      if (screenshot) {
        aiTrainer.recordCorrection(
          correction.screenshot_id,
          screenshot.extracted_data,
          { [correction.field]: correction.corrected_value },
          screenshot.confidence
        );
      }

      // Save correction to database
      await fetch('/api/submit-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correction)
      });

      setCorrections([...corrections, correction]);
      
      // Remove corrected screenshot from review list
      setScreenshots(screenshots.filter(s => s.id !== correction.screenshot_id));
      
    } catch (error) {
      console.error('Failed to submit correction:', error);
    }
  };

  const exportTrainingData = async () => {
    const trainingData = aiTrainer.exportTrainingData();
    
    // Download training data for model fine-tuning
    const blob = new Blob([JSON.stringify(trainingData, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rideshare-training-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🧠 AI Training Dashboard</h1>
        <p className="text-gray-600">
          Help improve AI accuracy by reviewing and correcting extracted data from your screenshots.
          Your corrections train the AI to better understand your specific rideshare app layouts.
        </p>
      </div>

      {/* Training Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{screenshots.length}</div>
          <div className="text-blue-800">Screenshots Need Review</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{corrections.length}</div>
          <div className="text-green-800">Corrections Submitted</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {screenshots.filter(s => s.confidence < 0.5).length}
          </div>
          <div className="text-orange-800">Low Confidence</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <button
            onClick={exportTrainingData}
            className="text-lg font-semibold text-purple-600 hover:text-purple-800"
          >
            📥 Export Training Data
          </button>
        </div>
      </div>

      {/* Screenshots for Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Screenshot List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Screenshots for Review</h2>
          
          {screenshots.map(screenshot => (
            <div 
              key={screenshot.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedScreenshot?.id === screenshot.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedScreenshot(screenshot)}
            >
              <div className="flex items-start space-x-4">
                <img 
                  src={screenshot.image_url} 
                  alt="Screenshot"
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">
                      {screenshot.screenshot_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      screenshot.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                      screenshot.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {(screenshot.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>💰 Earnings: ${screenshot.extracted_data.driver_earnings || '???'}</div>
                    <div>📏 Distance: {screenshot.extracted_data.distance || '???'} mi</div>
                    <div>🚗 Trips: {screenshot.extracted_data.total_trips || '???'}</div>
                  </div>
                  
                  {(!screenshot.extracted_data.driver_earnings || !screenshot.extracted_data.distance) && (
                    <div className="mt-2 text-xs text-red-600">
                      ⚠️ Missing critical data - needs manual correction
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {screenshots.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              🎉 No screenshots need review! Your AI is learning well.
            </div>
          )}
        </div>

        {/* Correction Panel */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Correction Panel</h2>
          
          {selectedScreenshot ? (
            <CorrectionForm 
              screenshot={selectedScreenshot}
              onSubmitCorrection={submitCorrection}
            />
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
              Select a screenshot to review and correct
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Correction Form Component
function CorrectionForm({ 
  screenshot, 
  onSubmitCorrection 
}: {
  screenshot: ScreenshotReview;
  onSubmitCorrection: (correction: CorrectionData) => void;
}) {
  const [formData, setFormData] = useState({
    driver_earnings: screenshot.extracted_data.driver_earnings || '',
    distance: screenshot.extracted_data.distance || '',
    total_trips: screenshot.extracted_data.total_trips || '',
    tip_amount: screenshot.extracted_data.tip_amount || '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Submit corrections for each changed field
    Object.entries(formData).forEach(([field, value]) => {
      if (field !== 'notes' && value !== screenshot.extracted_data[field]) {
        onSubmitCorrection({
          screenshot_id: screenshot.id,
          field,
          extracted_value: screenshot.extracted_data[field],
          corrected_value: field.includes('earnings') || field.includes('tip') || field.includes('distance') 
            ? parseFloat(value as string) || 0
            : field.includes('trips') 
            ? parseInt(value as string) || 0 
            : value,
          user_notes: formData.notes
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Screenshot Preview */}
      <div className="border rounded-lg p-4">
        <img 
          src={screenshot.image_url} 
          alt="Screenshot for review"
          className="w-full max-h-64 object-contain rounded"
        />
        <div className="mt-3 text-sm text-gray-600">
          <div><strong>Type:</strong> {screenshot.screenshot_type}</div>
          <div><strong>Confidence:</strong> {(screenshot.confidence * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* OCR Text */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Extracted Text (OCR)</h3>
        <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
          {screenshot.ocr_text}
        </pre>
      </div>

      {/* Correction Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver Earnings ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.driver_earnings}
              onChange={(e) => setFormData({...formData, driver_earnings: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="25.50"
            />
            <div className="text-xs text-gray-500 mt-1">
              Original: ${screenshot.extracted_data.driver_earnings || '???'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distance (miles)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.distance}
              onChange={(e) => setFormData({...formData, distance: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="12.5"
            />
            <div className="text-xs text-gray-500 mt-1">
              Original: {screenshot.extracted_data.distance || '???'} mi
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Trips
            </label>
            <input
              type="number"
              value={formData.total_trips}
              onChange={(e) => setFormData({...formData, total_trips: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="3"
            />
            <div className="text-xs text-gray-500 mt-1">
              Original: {screenshot.extracted_data.total_trips || '???'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tip Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.tip_amount}
              onChange={(e) => setFormData({...formData, tip_amount: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="5.00"
            />
            <div className="text-xs text-gray-500 mt-1">
              Original: ${screenshot.extracted_data.tip_amount || '???'}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Any additional context about this correction..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          ✅ Submit Corrections & Train AI
        </button>
      </form>

      {/* AI Training Tips */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">💡 Training Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Be accurate - the AI learns from your corrections</li>
          <li>• Focus on missing or incorrect earnings and distances first</li>
          <li>• Add notes if the screenshot layout is unusual</li>
          <li>• Review 10-15 screenshots to significantly improve accuracy</li>
        </ul>
      </div>
    </div>
  );
}