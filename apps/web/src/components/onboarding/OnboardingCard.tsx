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
    <div className="mx-6 mt-4 mb-2 bg-gradient-to-r from-[#111c35] via-[#101b31] to-[#0d1627] border border-blue-500/25 rounded-2xl shadow-xl shadow-blue-950/20 overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-[#1f2e4d]/60 bg-[#14203b]/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xs font-semibold text-white tracking-wide">
                Get started with your vault
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                {completedCount} of {totalCount} completed
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Complete these steps to get the most out of your zero-knowledge password manager.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1a2948] rounded-lg transition-colors"
            title={collapsed ? 'Expand onboarding' : 'Minimize onboarding'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-[#1a2948] rounded-lg transition-colors"
            title="Dismiss onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-[#16233d]">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Checklist Body */}
      {!collapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1: Account setup */}
          <div className="bg-[#0e1628]/80 border border-[#1d2a45] rounded-xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Step 1 • Completed
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">
                Account & Master Password
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your zero-knowledge vault key and Argon2id derivation are configured and active.
              </p>
            </div>
          </div>

          {/* Step 2: Import passwords */}
          <div
            className={`border rounded-xl p-3 flex flex-col justify-between transition-colors ${
              step2Done
                ? 'bg-[#0e1628]/80 border-[#1d2a45]'
                : 'bg-blue-950/20 border-blue-500/40 shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                {step2Done ? (
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Step 2 • Completed
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-400 flex items-center gap-1">
                    <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    Step 2 • Recommended
                  </span>
                )}
              </div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">
                Import Existing Passwords
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Quickly import your credentials from Bitwarden JSON, Chrome CSV, or Generic CSV.
              </p>
            </div>

            {!step2Done ? (
              <button
                onClick={onNavigateToImport}
                className="w-full mt-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Import passwords</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="text-[10px] text-emerald-400/90 flex items-center gap-1 mt-2">
                <span>✓ Passwords saved in vault</span>
              </div>
            )}
          </div>

          {/* Step 3: Browser Extension */}
          <div className="bg-[#0e1628]/80 border border-[#1d2a45] rounded-xl p-3 flex flex-col justify-between opacity-85">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-400 flex items-center gap-1">
                  <Puzzle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Step 3
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                  Coming soon
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">
                Browser Extension
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Autofill passwords and save new logins directly within Chrome, Firefox, and Edge.
              </p>
            </div>
            <div className="text-[10px] text-slate-500 italic mt-2">
              Extension manifest v3 in development
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

