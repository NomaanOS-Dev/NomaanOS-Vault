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
import { RefreshCw, Copy, Check, X } from 'lucide-react';

export const GeneratorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'password' | 'passphrase' | 'username'>('password');

  // Options states
  const [pwdOptions, setPwdOptions] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS);
  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseOptions>(DEFAULT_PASSPHRASE_OPTIONS);
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

  // Colorize password characters for readability (numbers blue, special cyan)
  const renderFormattedPassword = (pwd: string) => {
    return pwd.split('').map((char, idx) => {
      if (/[0-9]/.test(char)) {
        return (
          <span key={idx} className="text-blue-400 font-semibold">
            {char}
          </span>
        );
      } else if (/[^A-Za-z0-9]/.test(char)) {
        return (
          <span key={idx} className="text-amber-400 font-semibold">
            {char}
          </span>
        );
      }
      return <span key={idx}>{char}</span>;
    });
  };

  return (
    <div className="flex-1 bg-[#0a0f1d] p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Tab Header matching Screenshots 9 & 10 */}
        <div className="flex items-center bg-[#131d31] p-1 rounded-xl border border-[#1f2e4d]">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'password'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Password
          </button>
          <button
            onClick={() => setActiveTab('passphrase')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'passphrase'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Passphrase
          </button>
          <button
            onClick={() => setActiveTab('username')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'username'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Username
          </button>
        </div>

        {/* Info Banner */}
        {!infoDismissed && (
          <div className="p-4 bg-blue-600/15 border border-blue-500/30 rounded-xl relative flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white mb-0.5">Quickly create passwords</h4>
              <p className="text-xs text-slate-300">
                Easily create strong and unique passwords by clicking on 🔄 to help you keep your logins
                secure.
              </p>
            </div>
            <button
              onClick={() => setInfoDismissed(true)}
              className="text-slate-400 hover:text-white ml-4 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Prominent Generated Display Box */}
        <div className="p-5 bg-[#131d31] border border-[#1f2e4d] rounded-xl flex items-center justify-between shadow-lg">
          <div className="font-mono text-base tracking-wider break-all select-all text-slate-100 pr-4">
            {activeTab === 'password'
              ? renderFormattedPassword(generatedValue)
              : generatedValue}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={regenerate}
              title="Regenerate"
              className="p-2 bg-[#162036] hover:bg-[#1f2d48] border border-[#1f2e4d] rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              title="Copy to clipboard"
              className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Sections */}
        {activeTab === 'password' && (
          <div className="space-y-6">
            {/* Length card */}
            <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Options
              </span>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300">Length</label>
                  <span className="text-xs font-mono font-bold text-blue-400 bg-[#0e1628] border border-[#1f2e4d] px-2.5 py-1 rounded-md">
                    {pwdOptions.length}
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
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Value must be between 5 and 128. Use 14 characters or more to generate a strong password.
                </p>
              </div>
            </div>

            {/* Include Card */}
            <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Include
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer bg-[#0e1628] border border-[#1f2e4d] p-3 rounded-lg">
                  <input
                    type="checkbox"
                    checked={pwdOptions.useUpper}
                    onChange={(e) =>
                      setPwdOptions({ ...pwdOptions, useUpper: e.target.checked })
                    }
                    className="rounded bg-[#131d31] border-[#1f2e4d] text-blue-600"
                  />
                  <span>A-Z</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#0e1628] border border-[#1f2e4d] p-3 rounded-lg">
                  <input
                    type="checkbox"
                    checked={pwdOptions.useLower}
                    onChange={(e) =>
                      setPwdOptions({ ...pwdOptions, useLower: e.target.checked })
                    }
                    className="rounded bg-[#131d31] border-[#1f2e4d] text-blue-600"
                  />
                  <span>a-z</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#0e1628] border border-[#1f2e4d] p-3 rounded-lg">
                  <input
                    type="checkbox"
                    checked={pwdOptions.useNumbers}
                    onChange={(e) =>
                      setPwdOptions({ ...pwdOptions, useNumbers: e.target.checked })
                    }
                    className="rounded bg-[#131d31] border-[#1f2e4d] text-blue-600"
                  />
                  <span>0-9</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#0e1628] border border-[#1f2e4d] p-3 rounded-lg">
                  <input
                    type="checkbox"
                    checked={pwdOptions.useSpecial}
                    onChange={(e) =>
                      setPwdOptions({ ...pwdOptions, useSpecial: e.target.checked })
                    }
                    className="rounded bg-[#131d31] border-[#1f2e4d] text-blue-600"
                  />
                  <span>!@#$%^&*</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Minimum numbers
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={pwdOptions.minNumbers}
                    onChange={(e) =>
                      setPwdOptions({
                        ...pwdOptions,
                        minNumbers: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Minimum special
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={pwdOptions.minSpecial}
                    onChange={(e) =>
                      setPwdOptions({
                        ...pwdOptions,
                        minSpecial: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-2 select-none">
                <input
                  type="checkbox"
                  checked={pwdOptions.avoidAmbiguous}
                  onChange={(e) =>
                    setPwdOptions({ ...pwdOptions, avoidAmbiguous: e.target.checked })
                  }
                  className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                />
                <span className="text-xs text-slate-300">
                  Avoid ambiguous characters (e.g. 0, O, I, l, 1)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Passphrase Mode (Screenshot 10) */}
        {activeTab === 'passphrase' && (
          <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Options
            </span>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-300">Number of words</label>
                <span className="text-xs font-mono font-bold text-blue-400 bg-[#0e1628] border border-[#1f2e4d] px-2.5 py-1 rounded-md">
                  {passphraseOptions.numWords}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                value={passphraseOptions.numWords}
                onChange={(e) =>
                  setPassphraseOptions({
                    ...passphraseOptions,
                    numWords: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Value must be between 3 and 20. Use 4 words or more to generate a strong passphrase.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Word separator
              </label>
              <input
                type="text"
                value={passphraseOptions.separator}
                onChange={(e) =>
                  setPassphraseOptions({ ...passphraseOptions, separator: e.target.value })
                }
                placeholder="-"
                maxLength={4}
                className="w-32 bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={passphraseOptions.capitalize}
                  onChange={(e) =>
                    setPassphraseOptions({
                      ...passphraseOptions,
                      capitalize: e.target.checked,
                    })
                  }
                  className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                />
                <span className="text-xs text-slate-300">Capitalize</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={passphraseOptions.includeNumber}
                  onChange={(e) =>
                    setPassphraseOptions({
                      ...passphraseOptions,
                      includeNumber: e.target.checked,
                    })
                  }
                  className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                />
                <span className="text-xs text-slate-300">Include number</span>
              </label>
            </div>
          </div>
        )}

        {/* Username Mode */}
        {activeTab === 'username' && (
          <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Username Options
            </span>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUsernameOptions({ ...usernameOptions, type: 'word' })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  usernameOptions.type === 'word'
                    ? 'bg-blue-600/15 border-blue-500 text-blue-300'
                    : 'bg-[#0e1628] border-[#1f2e4d] text-slate-400'
                }`}
              >
                <span className="block text-xs font-bold">Word-Based</span>
                <span className="text-[11px] opacity-75">e.g. swift_falcon_42</span>
              </button>

              <button
                type="button"
                onClick={() => setUsernameOptions({ ...usernameOptions, type: 'random' })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  usernameOptions.type === 'random'
                    ? 'bg-blue-600/15 border-blue-500 text-blue-300'
                    : 'bg-[#0e1628] border-[#1f2e4d] text-slate-400'
                }`}
              >
                <span className="block text-xs font-bold">Random String</span>
                <span className="text-[11px] opacity-75">e.g. h8k2m9p4</span>
              </button>
            </div>

            {usernameOptions.type === 'word' && (
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={usernameOptions.includeNumber}
                    onChange={(e) =>
                      setUsernameOptions({
                        ...usernameOptions,
                        includeNumber: e.target.checked,
                      })
                    }
                    className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                  />
                  <span className="text-xs text-slate-300">Include numbers</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={usernameOptions.capitalize}
                    onChange={(e) =>
                      setUsernameOptions({
                        ...usernameOptions,
                        capitalize: e.target.checked,
                      })
                    }
                    className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                  />
                  <span className="text-xs text-slate-300">Capitalize words</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
