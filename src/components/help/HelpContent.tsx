import { Badge } from '@/components/ui/badge';
import { helpGuides, guideCategories, type HelpGuide } from './helpData';
import { Lightbulb, ChevronRight } from 'lucide-react';

interface HelpContentProps {
  topic: string;
  onNavigate?: (topic: string) => void;
}

export function HelpContent({ topic, onNavigate }: HelpContentProps) {
  const guide = helpGuides[topic];

  if (!guide) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>ไม่พบคู่มือสำหรับหน้านี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900">{guide.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{guide.description}</p>
      </div>

      {/* Steps */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">ขั้นตอนการใช้งาน</h4>
        <div className="space-y-2">
          {guide.steps.map((s) => (
            <div key={s.step} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                {s.step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{s.text}</p>
                {s.tip && (
                  <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    {s.tip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      {guide.tips && guide.tips.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1">
            <Lightbulb className="h-4 w-4" />
            เคล็ดลับ
          </h4>
          <ul className="space-y-1">
            {guide.tips.map((tip, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">*</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigate to other guides */}
      {onNavigate && (
        <div className="border-t pt-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">คู่มือหน้าอื่น</h4>
          {guideCategories.map((cat) => (
            <div key={cat.label} className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">{cat.label}</p>
              <div className="flex flex-wrap gap-1">
                {cat.guides.map((gId) => {
                  const g = helpGuides[gId];
                  if (!g || gId === topic) return null;
                  return (
                    <button
                      key={gId}
                      onClick={() => onNavigate(gId)}
                      className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition-colors text-gray-600 flex items-center gap-1"
                    >
                      {g.title.length > 15 ? g.title.slice(0, 15) + '...' : g.title}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
