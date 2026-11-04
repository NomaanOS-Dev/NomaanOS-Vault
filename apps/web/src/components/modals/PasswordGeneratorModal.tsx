import React, { useState } from 'react';
import {
  generatePassword,
  generatePassphrase,
  GeneratorOptions,
  PassphraseOptions,
  DEFAULT_GENERATOR_OPTIONS,
  DEFAULT_PASSPHRASE_OPTIONS,
} from '../../lib/generator';
import { X, RefreshCw, Copy, Check, KeyRound } from 'lucide-react';

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
  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseOptions>(
    DEFAULT_PASSPHRASE_OPTIONS
  );

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-[#E5E9E5] rounded-2xl shadow-modal p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#78827B] hover:text-[#202923] p-1 rounded-lg hover:bg-[#F3F5F2]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568]">
            <KeyRound className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-[#202923]">Password Generator</h3>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-[#F7F8F5] p-1 rounded-xl border border-[#E5E9E5] text-xs mb-4">
          <button
            type="button"
            onClick={() => {
              setTab('password');
              setGenerated(generatePassword(options));
            }}
            className={`flex-1 py-1.5 font-semibold rounded-lg transition-colors ${
              tab === 'password'
                ? 'bg-white text-[#168568] shadow-subtle'
                : 'text-[#78827B] hover:text-[#202923]'
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
            className={`flex-1 py-1.5 font-semibold rounded-lg transition-colors ${
              tab === 'passphrase'
                ? 'bg-white text-[#168568] shadow-subtle'
                : 'text-[#78827B] hover:text-[#202923]'
            }`}
          >
            Passphrase
          </button>
        </div>

        {/* Generated Output */}
        <div className="p-3.5 bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl flex items-center justify-between gap-2 mb-4">
          <div className="font-mono text-sm font-bold tracking-wide break-all select-all text-[#202923]">
            {generated}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleRegenerate}
              title="Regenerate"
              className="p-1.5 text-[#78827B] hover:text-[#168568] rounded-lg hover:bg-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy"
              className="p-1.5 text-[#78827B] hover:text-[#168568] rounded-lg hover:bg-white"
            >
              {copied ? <Check className="w-4 h-4 text-[#168568]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Password Options */}
        {tab === 'password' ? (
          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-[#202923] mb-1">
                <span>Length</span>
                <span className="text-[#168568] font-mono">{options.length}</span>
              </div>
              <input
                type="range"
                min={8}
                max={64}
                value={options.length}
                onChange={(e) => {
                  const len = parseInt(e.target.value, 10);
                  const newOpts = { ...options, length: len };
                  setOptions(newOpts);
                  setGenerated(generatePassword(newOpts));
                }}
                className="w-full accent-[#168568] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 font-medium text-[#202923]">
              <label className="flex items-center gap-2 cursor-pointer bg-[#F7F8F5] p-2 rounded-lg border border-[#E5E9E5]">
                <input
                  type="checkbox"
                  checked={options.useUpper}
                  onChange={(e) => {
                    const newOpts = { ...options, useUpper: e.target.checked };
                    setOptions(newOpts);
                    setGenerated(generatePassword(newOpts));
                  }}
                  className="rounded text-[#168568] focus:ring-[#168568]"
                />
                <span>A–Z Upper</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-[#F7F8F5] p-2 rounded-lg border border-[#E5E9E5]">
                <input
                  type="checkbox"
                  checked={options.useLower}
                  onChange={(e) => {
                    const newOpts = { ...options, useLower: e.target.checked };
                    setOptions(newOpts);
                    setGenerated(generatePassword(newOpts));
                  }}
                  className="rounded text-[#168568] focus:ring-[#168568]"
                />
                <span>a–z Lower</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-[#F7F8F5] p-2 rounded-lg border border-[#E5E9E5]">
                <input
                  type="checkbox"
                  checked={options.useNumbers}
                  onChange={(e) => {
                    const newOpts = { ...options, useNumbers: e.target.checked };
                    setOptions(newOpts);
                    setGenerated(generatePassword(newOpts));
                  }}
                  className="rounded text-[#168568] focus:ring-[#168568]"
                />
                <span>0–9 Numbers</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-[#F7F8F5] p-2 rounded-lg border border-[#E5E9E5]">
                <input
                  type="checkbox"
                  checked={options.useSpecial}
                  onChange={(e) => {
                    const newOpts = { ...options, useSpecial: e.target.checked };
                    setOptions(newOpts);
                    setGenerated(generatePassword(newOpts));
                  }}
                  className="rounded text-[#168568] focus:ring-[#168568]"
                />
                <span>!@# Special</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-[#202923] mb-1">
                <span>Words</span>
                <span className="text-[#168568] font-mono">{passphraseOptions.numWords}</span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                value={passphraseOptions.numWords}
                onChange={(e) => {
                  const wc = parseInt(e.target.value, 10);
                  const newOpts = { ...passphraseOptions, numWords: wc };
                  setPassphraseOptions(newOpts);
                  setGenerated(generatePassphrase(newOpts));
                }}
                className="w-full accent-[#168568] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 pt-4 border-t border-[#E5E9E5] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#78827B] hover:text-[#202923]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUse}
            className="px-5 py-2 bg-[#168568] hover:bg-[#126e56] text-white text-xs font-semibold rounded-xl shadow-subtle transition-colors"
          >
            Use This Password
          </button>
        </div>
      </div>
    </div>
  );
};
