import React from 'react';
import {
  ShieldAlert,
  Copy,
  KeyRound,
  Globe,
  Sparkles,
  Lock,
  ShieldCheck,
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
      statusColor: 'text-amber-800 border-amber-200 bg-amber-50',
    },
    {
      id: 'reused_passwords',
      icon: Copy,
      title: 'Reused Passwords',
      description:
        'Flags identical passwords shared across multiple accounts to mitigate credential stuffing attacks.',
      badge: 'Coming Soon',
      statusColor: 'text-rose-700 border-rose-200 bg-rose-50',
    },
    {
      id: 'breached_credentials',
      icon: ShieldAlert,
      title: 'Data Breach Monitor',
      description:
        'Zero-knowledge k-Anonymity checks against known dark web database breaches.',
      badge: 'Coming Soon',
      statusColor: 'text-purple-700 border-purple-200 bg-purple-50',
    },
    {
      id: 'insecure_websites',
      icon: Globe,
      title: 'Insecure Websites (HTTP)',
      description:
        'Identifies stored logins using unencrypted HTTP connections rather than HTTPS.',
      badge: 'Coming Soon',
      statusColor: 'text-blue-700 border-blue-200 bg-blue-50',
    },
    {
      id: 'inactive_2fa',
      icon: Lock,
      title: 'Missing Two-Step Login (2FA)',
      description:
        'Highlights sites supporting TOTP authenticator keys where 2FA has not yet been configured.',
      badge: 'Coming Soon',
      statusColor: 'text-[#168568] border-[#B7E3D6] bg-[#E7F4EF]',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F8F5] overflow-y-auto min-w-0">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E9E5] px-4 sm:px-8 py-5 shrink-0 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#202923] tracking-tight">
              Security Intelligence & Reports
            </h1>
            <p className="text-xs text-[#78827B] mt-0.5">
              Client-side zero-knowledge security audits and breach alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6] flex items-center gap-1.5 shadow-subtle">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Coming in Next Release</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Banner */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E5E9E5] flex flex-col sm:flex-row items-start gap-4 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568] shrink-0 shadow-subtle">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#202923] mb-1">
              Automated Vault Health Reports in Development
            </h3>
            <p className="text-xs text-[#78827B] leading-relaxed max-w-3xl">
              Security Reports execute client-side zero-knowledge audits directly in your browser.
              Your passwords never leave your device in plaintext — cryptographic hashes will be
              evaluated locally or via k-Anonymity protocols. These audit tools are scheduled for release in the upcoming update.
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
                className="bg-white border border-[#E5E9E5] hover:border-[#B7E3D6] hover:shadow-cardHover rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-150"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#F7F8F5] border border-[#E5E9E5] flex items-center justify-center text-[#168568]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${rep.statusColor}`}
                    >
                      {rep.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#202923] mb-1.5">{rep.title}</h4>
                  <p className="text-xs text-[#78827B] leading-relaxed">{rep.description}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E5E9E5] flex items-center justify-between text-[11px] text-[#78827B]">
                  <span>Zero-knowledge client audit</span>
                  <span className="italic font-medium">Scheduled</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
