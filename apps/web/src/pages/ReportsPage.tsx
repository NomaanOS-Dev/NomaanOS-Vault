import React from 'react';
import {
  BarChart3,
  ShieldAlert,
  Copy,
  KeyRound,
  Globe,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const reportsList = [
    {
      id: 'weak_passwords',
      icon: KeyRound,
      title: 'Exposed & Weak Passwords',
      description:
        'Analyzes vault items for weak entropy, dictionary words, and compromised password lists.',
      badge: 'Coming Soon',
      statusColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    {
      id: 'reused_passwords',
      icon: Copy,
      title: 'Reused Passwords',
      description:
        'Flags identical passwords shared across multiple accounts to mitigate credential stuffing attacks.',
      badge: 'Coming Soon',
      statusColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
    {
      id: 'breached_credentials',
      icon: ShieldAlert,
      title: 'Data Breach Monitor',
      description:
        'Zero-knowledge k-Anonymity checks against known dark web database breaches.',
      badge: 'Coming Soon',
      statusColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    },
    {
      id: 'insecure_websites',
      icon: Globe,
      title: 'Insecure Websites (HTTP)',
      description:
        'Identifies stored logins using unencrypted HTTP connections rather than HTTPS.',
      badge: 'Coming Soon',
      statusColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    },
    {
      id: 'inactive_2fa',
      icon: Lock,
      title: 'Missing Two-Step Login (2FA)',
      description:
        'Highlights sites supporting TOTP authenticator keys where 2FA has not yet been configured.',
      badge: 'Coming Soon',
      statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f1d] overflow-y-auto">
      {/* Header */}
      <div className="h-16 border-b border-[#1e293b] px-8 flex items-center justify-between shrink-0 bg-[#0c1322]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">
              Security Reports
            </h1>
            <p className="text-[11px] text-slate-400">
              Audit your vault for security risks, weak passwords, and data breach exposures.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Security Intelligence
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#101b31] to-[#0e1628] border border-blue-500/25 flex items-start gap-4 shadow-lg shadow-blue-950/10">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Automated Vault Health Reports are in Development
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              Security Reports provide end-to-end zero-knowledge audits directly in your browser.
              Your passwords never leave your device unencrypted — cryptographic hashes are evaluated
              locally or via k-Anonymity protocols. These audit tools are scheduled for release in the upcoming update.
            </p>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportsList.map((rep) => {
            const Icon = rep.icon;
            return (
              <div
                key={rep.id}
                className="bg-[#0f172a] border border-[#1e293b] hover:border-[#2b3d5c] rounded-xl p-5 flex flex-col justify-between transition-all duration-150 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[#162036] border border-[#243552] flex items-center justify-center text-slate-300 group-hover:text-blue-400 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${rep.statusColor}`}
                    >
                      {rep.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 mb-1.5">
                    {rep.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {rep.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-[11px] text-slate-500">
                  <span>Zero-knowledge client audit</span>
                  <span className="italic">Scheduled</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

