import React, { useState } from 'react';
import {
  generatePassword,
  generatePassphrase,
  GeneratorOptions,
  PassphraseOptions,
  DEFAULT_GENERATOR_OPTIONS,
  DEFAULT_PASSPHRASE_OPTIONS,
} from '../../lib/generator';
import { X, RefreshCw, Copy, Check } from 'lucide-react';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSelectPassword,
}) => {
  const [tab, setTab] = useState<'password' | 'passphrase'>('password');
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS);
  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseOptions>(DEFAULT_PASSPHRASE_OPTIONS);

  const [generated, setGenerated] = useState(() => generatePassword(DEFAULT_GENERATOR_OPTIONS));
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRegenerate = () => {
    if (tab === 'password') {
      setGenerated(generatePassword(options));
    } else {
      setGenerated(generatePassphrase(passphraseOptions));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUse = () => {
    onSelectPassword(generated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#131d31] border border-[#1f2e4d] rounded-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white mb-3">Password Generator</h3>

        {/* Mode Selector */}
        <div className="flex bg-[#0e1628] p-0.5 rounded-lg border border-[#1f2e4d] text-xs mb-4">
          <button
            type="button"
            onClick={() => {
              setTab('password');
              setGenerated(generatePassword(options));
            }}
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
              tab === 'password' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('passphrase');
              setGenerated(generatePassphrase(passphraseOptions));
            }}
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
              tab === 'passphrase' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Passphrase
          </button>
        </div>

        {/* Generated Display Box */}
        <div className="p-3 bg-[#0a0f1d] border border-[#1f2e4d] rounded-lg flex items-center justify-between mb-4">
          <span className="font-mono text-sm tracking-wider text-blue-400 break-all select-all">
            {generated}
          </span>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <button
              onClick={handleRegenerate}
              title="Regenerate"
              className="p-1.5 hover:bg-[#162036] rounded text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              title="Copy"
              className="p-1.5 hover:bg-[#162036] rounded text-slate-300 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Options */}
        {tab === 'password' ? (
          <div className="space-y-3 mb-6 text-xs text-slate-300">
            <div>
              <div className="flex justify-between mb-1">
                <span>Length</span>
                <span className="font-mono text-blue-400 font-semibold">{options.length}</span>
              </div>
              <input
                type="range"
                min={5}
                max={128}
                value={options.length}
                onChange={(e) => {
                  const next = { ...options, length: Number(e.target.value) };
                  setOptions(next);
                  setGenerated(generatePassword(next));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.useUpper}
                  onChange={(e) => {
                    const next = { ...options, useUpper: e.target.checked };
                    setOptions(next);
                    setGenerated(generatePassword(next));
                  }}
                  className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                />
                <span>A-Z</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.useLower}
                  onChange={(e) => {
                    const next = { ...options, useLower: e.target.checked };
                    setOptions(next);
                    setGenerated(generatePassword(next));
                  }}
                  className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                />
                <span>a-z</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.useNumbers}
                  onChange={(e) => {
                    const next = { ...options, useNumbers: e.target.checked };
                    setOptions(next);
                    setGenerated(generatePassword(next));
                  }}
                  className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                />
                <span>0-9</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.useSpecial}
                  onChange={(e) => {
                    const next = { ...options, useSpecial: e.target.checked };
                    setOptions(next);
                    setGenerated(generatePassword(next));
                  }}
                  className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                />
                <span>!@#$%^&*</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-6 text-xs text-slate-300">
            <div>
              <div className="flex justify-between mb-1">
                <span>Number of words</span>
                <span className="font-mono text-blue-400 font-semibold">
                  {passphraseOptions.numWords}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                value={passphraseOptions.numWords}
                onChange={(e) => {
                  const next = { ...passphraseOptions, numWords: Number(e.target.value) };
                  setPassphraseOptions(next);
                  setGenerated(generatePassphrase(next));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={passphraseOptions.capitalize}
                  onChange={(e) => {
                    const next = { ...passphraseOptions, capitalize: e.target.checked };
                    setPassphraseOptions(next);
                    setGenerated(generatePassphrase(next));
                  }}
                  className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                />
                <span>Capitalize</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={passphraseOptions.includeNumber}
                  onChange={(e) => {
                    const next = { ...passphraseOptions, includeNumber: e.target.checked };
                    setPassphraseOptions(next);
                    setGenerated(generatePassphrase(next));
                  }}
                  className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                />
                <span>Include number</span>
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#162036] hover:bg-[#1f2d48] text-slate-300 rounded-lg text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUse}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs"
          >
            Use this password
          </button>
        </div>
      </div>
    </div>
  );
};
