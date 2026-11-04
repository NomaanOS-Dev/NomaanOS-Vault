import React, { useState, useEffect } from 'react';
import {
  generatePassword,
  generatePassphrase,
  generateUsername,
  GeneratorOptions,
  PassphraseOptions,
  UsernameOptions,
  DEFAULT_GENERATOR_OPTIONS,
  DEFAULT_PASSPHRASE_OPTIONS,
  DEFAULT_USERNAME_OPTIONS,
} from '../lib/generator';
import {
  RefreshCw,
  Copy,
  Check,
  X,
  Sparkles,
  KeyRound,
  Type,
  AtSign,
} from 'lucide-react';

export const GeneratorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'password' | 'passphrase' | 'username'>('password');

  // Options states
  const [pwdOptions, setPwdOptions] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS);
  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseOptions>(
    DEFAULT_PASSPHRASE_OPTIONS
  );
  const [usernameOptions, setUsernameOptions] = useState<UsernameOptions>(DEFAULT_USERNAME_OPTIONS);

  // Output states
  const [generatedValue, setGeneratedValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [infoDismissed, setInfoDismissed] = useState(false);

  const regenerate = () => {
    if (activeTab === 'password') {
      setGeneratedValue(generatePassword(pwdOptions));
    } else if (activeTab === 'passphrase') {
      setGeneratedValue(generatePassphrase(passphraseOptions));
    } else {
      setGeneratedValue(generateUsername(usernameOptions));
    }
  };

  useEffect(() => {
    regenerate();
  }, [activeTab, pwdOptions, passphraseOptions, usernameOptions]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Colorize password characters for visual entropy analysis
  const renderFormattedPassword = (pwd: string) => {
    return pwd.split('').map((char, idx) => {
      if (/[0-9]/.test(char)) {
        return (
          <span key={idx} className="text-[#168568] font-bold">
            {char}
          </span>
        );
      } else if (/[^A-Za-z0-9]/.test(char)) {
        return (
          <span key={idx} className="text-amber-600 font-bold">
            {char}
          </span>
        );
      }
      return (
        <span key={idx} className="text-[#202923]">
          {char}
        </span>
      );
    });
  };

  // Calculate entropy strength score
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-slate-300' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 14) score++;
    if (pwd.length >= 20) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score <= 5) return { score: 3, label: 'Strong', color: 'bg-blue-600' };
    return { score: 4, label: 'Exceptional (Military Grade)', color: 'bg-[#168568]' };
  };

  const strength = getPasswordStrength(generatedValue);

  return (
    <div className="flex-1 bg-[#F7F8F5] p-4 sm:p-8 overflow-y-auto min-w-0">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202923] tracking-tight">
            Password & Credential Generator
          </h1>
          <p className="text-xs sm:text-sm text-[#78827B] mt-1">
            Generate cryptographically random passwords, memorable passphrases, and secure username aliases.
          </p>
        </div>

        {/* Tab Selection Header */}
        <div className="flex items-center bg-[#E5E9E5]/60 p-1 rounded-2xl border border-[#E5E9E5]">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 ${
              activeTab === 'password'
                ? 'bg-white text-[#168568] shadow-subtle'
                : 'text-[#78827B] hover:text-[#202923]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password</span>
          </button>
          <button
            onClick={() => setActiveTab('passphrase')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 ${
              activeTab === 'passphrase'
                ? 'bg-white text-[#168568] shadow-subtle'
                : 'text-[#78827B] hover:text-[#202923]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Passphrase</span>
          </button>
          <button
            onClick={() => setActiveTab('username')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 ${
              activeTab === 'username'
                ? 'bg-white text-[#168568] shadow-subtle'
                : 'text-[#78827B] hover:text-[#202923]'
            }`}
          >
            <AtSign className="w-3.5 h-3.5" />
            <span>Username</span>
          </button>
        </div>

        {/* Info Tip Banner */}
        {!infoDismissed && (
          <div className="p-4 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#168568] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#168568]">High-Entropy Generation</h4>
                <p className="text-[11px] text-[#202923]/80 leading-relaxed mt-0.5">
                  Values are generated on this device using Web Cryptography API random entropy.
                  They are never sent to a server.
                </p>
              </div>
            </div>
            <button
              onClick={() => setInfoDismissed(true)}
              className="text-[#78827B] hover:text-[#202923] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Prominent Generated Display Box */}
        <div className="bg-white border border-[#E5E9E5] rounded-3xl p-5 sm:p-6 shadow-card space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="font-mono text-lg sm:text-2xl tracking-wide break-all select-all pr-2">
              {activeTab === 'password'
                ? renderFormattedPassword(generatedValue)
                : generatedValue}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={regenerate}
                title="Regenerate"
                className="p-2.5 bg-[#F7F8F5] hover:bg-[#EAECE8] border border-[#E5E9E5] rounded-xl text-[#202923] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                title="Copy to clipboard"
                className="px-4 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white rounded-xl text-xs font-semibold shadow-subtle transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Strength Bar for Passwords */}
          {activeTab === 'password' && (
            <div className="pt-2 border-t border-[#E5E9E5]">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-[#78827B]">Entropy Strength:</span>
                <span className="font-bold text-[#202923]">{strength.label}</span>
              </div>
              <div className="h-1.5 w-full bg-[#E5E9E5] rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      strength.score >= step ? strength.color : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Configuration Sections */}
        {activeTab === 'password' && (
          <div className="space-y-4">
            {/* Length Configuration Card */}
            <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 space-y-4 shadow-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568]">
                    Password Length
                  </h3>
                  <p className="text-[11px] text-[#78827B]">Recommended: 16+ characters</p>
                </div>
                <span className="text-sm font-mono font-bold text-[#168568] bg-[#E7F4EF] border border-[#B7E3D6] px-3 py-1 rounded-xl">
                  {pwdOptions.length} characters
                </span>
              </div>

              <input
                type="range"
                min={5}
                max={128}
                value={pwdOptions.length}
                onChange={(e) =>
                  setPwdOptions({ ...pwdOptions, length: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#168568] cursor-pointer"
              />
            </div>

            {/* Character Types Card */}
            <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 space-y-3.5 shadow-subtle">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568]">
                Character Types Included
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-medium text-[#202923]">
                <label className="flex items-center gap-2 cursor-pointer bg-[#F7F8F5] border border-[#E5E9E5] p-3 rounded-xl hover:border-[#168568] transition-colors">
                  <input
                    type="checkbox"
                    checked={pwdOptions.useUpper}
                    onChange={(e) =>
                      setPwdOptions({ ...pwdOptions, useUpper: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#168568] focus:ring-[#168568]"
                  />
                  <span>A–Z Uppercase</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#F7F8F5] border border-[#E5E9E5] p-3 rounded-xl hover:border-[#168568] transition-colors">
                  <input
                    type="checkbox"
                    checked={pwdOptions.useLower}
                    onChange={(e) =>
                      setPwdOptions({ ...pwdOptions, useLower: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#168568] focus:ring-[#168568]"
                  />
                  <span>a–z Lowercase</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#F7F8F5] border border-[#E5E9E5] p-3 rounded-xl hover:border-[#168568] transition-colors">
                  <input
                    type="checkbox"
                    checked={pwdOptions.useNumbers}
                    onChange={(e) =>
                      setPwdOptions({ ...pwdOptions, useNumbers: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#168568] focus:ring-[#168568]"
                  />
                  <span>0–9 Numbers</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#F7F8F5] border border-[#E5E9E5] p-3 rounded-xl hover:border-[#168568] transition-colors">
                  <input
                    type="checkbox"
                    checked={pwdOptions.useSpecial}
                    onChange={(e) =>
                      setPwdOptions({ ...pwdOptions, useSpecial: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#168568] focus:ring-[#168568]"
                  />
                  <span>!@#$% Symbols</span>
                </label>
              </div>

              {/* Special options */}
              <div className="pt-2 border-t border-[#E5E9E5] flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-[#202923]">
                  <input
                    type="checkbox"
                    checked={pwdOptions.avoidAmbiguous}
                    onChange={(e) =>
                      setPwdOptions({ ...pwdOptions, avoidAmbiguous: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#168568] focus:ring-[#168568]"
                  />
                  <span>Avoid ambiguous characters (e.g. 0, O, l, 1, I)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Passphrase Tab */}
        {activeTab === 'passphrase' && (
          <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 space-y-4 shadow-subtle">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568]">
              Passphrase Settings
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#202923]">Word Count</label>
                <span className="text-xs font-mono font-bold text-[#168568] bg-[#E7F4EF] border border-[#B7E3D6] px-2.5 py-0.5 rounded-lg">
                  {passphraseOptions.numWords} words
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={15}
                value={passphraseOptions.numWords}
                onChange={(e) =>
                  setPassphraseOptions({
                    ...passphraseOptions,
                    numWords: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-[#168568] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#202923] mb-1">
                  Word Separator
                </label>
                <select
                  value={passphraseOptions.separator}
                  onChange={(e) =>
                    setPassphraseOptions({ ...passphraseOptions, separator: e.target.value })
                  }
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl px-3 py-2 text-xs text-[#202923] outline-none"
                >
                  <option value="-">Hyphen (-)</option>
                  <option value=" ">Space ( )</option>
                  <option value="_">Underscore (_)</option>
                  <option value=".">Period (.)</option>
                  <option value="/">Slash (/)</option>
                </select>
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#202923]">
                  <input
                    type="checkbox"
                    checked={passphraseOptions.capitalize}
                    onChange={(e) =>
                      setPassphraseOptions({
                        ...passphraseOptions,
                        capitalize: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-[#168568] focus:ring-[#168568]"
                  />
                  <span>Capitalize each word</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#202923]">
                  <input
                    type="checkbox"
                    checked={passphraseOptions.includeNumber}
                    onChange={(e) =>
                      setPassphraseOptions({
                        ...passphraseOptions,
                        includeNumber: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-[#168568] focus:ring-[#168568]"
                  />
                  <span>Append random number</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Username Tab */}
        {activeTab === 'username' && (
          <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 space-y-4 shadow-subtle">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568]">
              Username Format
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#202923]">
                <input
                  type="radio"
                  name="userType"
                  checked={usernameOptions.type === 'word'}
                  onChange={() => setUsernameOptions({ ...usernameOptions, type: 'word' })}
                  className="text-[#168568] focus:ring-[#168568]"
                />
                <span>Memorable Random Word Username</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#202923]">
                <input
                  type="radio"
                  name="userType"
                  checked={usernameOptions.type === 'random'}
                  onChange={() => setUsernameOptions({ ...usernameOptions, type: 'random' })}
                  className="text-[#168568] focus:ring-[#168568]"
                />
                <span>Randomized Character String</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
