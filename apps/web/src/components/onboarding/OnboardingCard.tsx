import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Puzzle,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface OnboardingCardProps {
  hasItems: boolean;
  onNavigateToImport: () => void;
  onDismiss: () => void;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  hasItems,
  onNavigateToImport,
  onDismiss,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Step 1: Account setup (Always completed for authenticated users with vault key)
  const step1Done = true;
  // Step 2: Import passwords (Completed if items exist or user imported)
  const step2Done = hasItems;
  // Step 3: Browser extension (Coming soon)
  const completedCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0);
  const totalCount = 3;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="mx-4 sm:mx-6 mt-4 mb-3 bg-white border border-[#E5E9E5] rounded-2xl shadow-card overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#E5E9E5] bg-[#F7F8F5]/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-[#202923] tracking-tight">
                Get started with your vault
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6]">
                {completedCount} of {totalCount} completed
              </span>
            </div>
            <p className="text-[11px] text-[#78827B] truncate sm:whitespace-normal">
              Complete these setup steps to activate full protection for your digital credentials.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2] rounded-lg transition-colors"
            title={collapsed ? 'Expand onboarding' : 'Minimize onboarding'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 text-[#78827B] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Dismiss onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-[#E5E9E5]">
        <div
          className="h-full bg-[#168568] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Checklist Body */}
      {!collapsed && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Step 1: Account setup */}
          <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#168568] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#168568] shrink-0" />
                  Step 1 • Completed
                </span>
              </div>
              <h4 className="text-xs font-bold text-[#202923] mb-1">
                Account & Master Password
              </h4>
              <p className="text-[11px] text-[#78827B] leading-relaxed">
                Your zero-knowledge encryption key and Argon2id derivation are configured.
              </p>
            </div>
          </div>

          {/* Step 2: Import passwords */}
          <div
            className={`border rounded-xl p-3.5 flex flex-col justify-between transition-colors ${
              step2Done
                ? 'bg-[#F7F8F5] border-[#E5E9E5]'
                : 'bg-[#E7F4EF]/50 border-[#B7E3D6]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                {step2Done ? (
                  <span className="text-[10px] font-bold tracking-wider uppercase text-[#168568] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#168568] shrink-0" />
                    Step 2 • Completed
                  </span>
                ) : (
                  <span className="text-[10px] font-bold tracking-wider uppercase text-[#168568] flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-[#168568] shrink-0" />
                    Step 2 • Recommended
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-[#202923] mb-1">
                Import Existing Passwords
              </h4>
              <p className="text-[11px] text-[#78827B] leading-relaxed mb-3">
                Quickly import your credentials from Bitwarden JSON, Chrome CSV, or Generic CSV.
              </p>
            </div>

            {!step2Done ? (
              <button
                onClick={onNavigateToImport}
                className="w-full mt-2 py-1.5 px-3 bg-[#168568] hover:bg-[#126e56] text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-subtle"
              >
                <span>Import passwords</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="text-[10px] text-[#168568] font-medium flex items-center gap-1 mt-2">
                <span>✓ Passwords saved in vault</span>
              </div>
            )}
          </div>

          {/* Step 3: Browser Extension */}
          <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3.5 flex flex-col justify-between opacity-85">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-700 flex items-center gap-1.5">
                  <Puzzle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Step 3
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  Coming soon
                </span>
              </div>
              <h4 className="text-xs font-bold text-[#202923] mb-1">
                Browser Extension
              </h4>
              <p className="text-[11px] text-[#78827B] leading-relaxed">
                Autofill passwords and save new logins directly within Chrome, Firefox, and Edge.
              </p>
            </div>
            <div className="text-[10px] text-[#78827B] italic mt-2">
              Extension manifest v3 in development
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
