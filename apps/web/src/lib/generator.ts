export interface GeneratorOptions {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useNumbers: boolean;
  useSpecial: boolean;
  minNumbers: number;
  minSpecial: number;
  avoidAmbiguous: boolean;
}

export interface PassphraseOptions {
  numWords: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export interface UsernameOptions {
  type: 'word' | 'random';
  includeNumber: boolean;
  capitalize: boolean;
  separator: string;
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 14,
  useUpper: true,
  useLower: true,
  useNumbers: true,
  useSpecial: true,
  minNumbers: 1,
  minSpecial: 0,
  avoidAmbiguous: false,
};

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = {
  numWords: 4,
  separator: '-',
  capitalize: false,
  includeNumber: false,
};

export const DEFAULT_USERNAME_OPTIONS: UsernameOptions = {
  type: 'word',
  includeNumber: true,
  capitalize: false,
  separator: '_',
};

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const AMBIGUOUS = '0OIl1|';

const WORD_LIST = [
  'apple', 'anchor', 'arrow', 'autumn', 'breeze', 'bridge', 'bubble', 'cabin',
  'castle', 'cedar', 'canyon', 'cliff', 'cloud', 'comet', 'copper', 'coral',
  'crystal', 'delta', 'desert', 'diamond', 'dolphin', 'dragon', 'eagle', 'echo',
  'ember', 'falcon', 'feather', 'forest', 'fossil', 'frost', 'galaxy', 'garden',
  'geyser', 'glacier', 'granite', 'harbor', 'haven', 'hawk', 'horizon', 'island',
  'jungle', 'lagoon', 'lantern', 'meadow', 'meteor', 'mountain', 'nebula', 'oasis',
  'ocean', 'orchid', 'pebble', 'phoenix', 'planet', 'prairie', 'prism', 'quasar',
  'radiant', 'rainbow', 'ravine', 'reef', 'river', 'rocket', 'saddle', 'safari',
  'sahara', 'sailor', 'samurai', 'sand', 'saturn', 'shadow', 'shield', 'sierra',
  'silver', 'solar', 'spark', 'sphinx', 'spirit', 'spring', 'star', 'stellar',
  'summit', 'sunset', 'swift', 'tempest', 'thunder', 'timber', 'topaz', 'torrent',
  'valley', 'vapor', 'velvet', 'vortex', 'voyage', 'walnut', 'wave', 'willow',
  'winter', 'zenith', 'zephyr'
];

/**
 * Generate cryptographically secure password
 */
export function generatePassword(options: GeneratorOptions = DEFAULT_GENERATOR_OPTIONS): string {
  let upper = UPPER;
  let lower = LOWER;
  let numbers = NUMBERS;
  let special = SPECIAL;

  if (options.avoidAmbiguous) {
    upper = upper.split('').filter((c) => !AMBIGUOUS.includes(c)).join('');
    lower = lower.split('').filter((c) => !AMBIGUOUS.includes(c)).join('');
    numbers = numbers.split('').filter((c) => !AMBIGUOUS.includes(c)).join('');
  }

  let charset = '';
  if (options.useUpper) charset += upper;
  if (options.useLower) charset += lower;
  if (options.useNumbers) charset += numbers;
  if (options.useSpecial) charset += special;

  if (!charset) charset = lower + numbers;

  const getRandomChar = (chars: string) => {
    const randomArray = new Uint32Array(1);
    window.crypto.getRandomValues(randomArray);
    return chars[randomArray[0] % chars.length];
  };

  const passwordChars: string[] = [];

  // Guarantee configured minimums
  if (options.useUpper) passwordChars.push(getRandomChar(upper));
  if (options.useLower) passwordChars.push(getRandomChar(lower));
  if (options.useNumbers) {
    for (let i = 0; i < Math.max(1, options.minNumbers); i++) {
      passwordChars.push(getRandomChar(numbers));
    }
  }
  if (options.useSpecial && options.minSpecial > 0) {
    for (let i = 0; i < options.minSpecial; i++) {
      passwordChars.push(getRandomChar(special));
    }
  }

  // Fill remaining length
  while (passwordChars.length < Math.max(5, options.length)) {
    passwordChars.push(getRandomChar(charset));
  }

  // Cryptographic Fisher-Yates shuffle
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const randomArray = new Uint32Array(1);
    window.crypto.getRandomValues(randomArray);
    const j = randomArray[0] % (i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.slice(0, Math.max(5, options.length)).join('');
}

/**
 * Generate cryptographically secure memorable passphrase
 */
export function generatePassphrase(options: PassphraseOptions = DEFAULT_PASSPHRASE_OPTIONS): string {
  const words: string[] = [];
  const numWords = Math.min(20, Math.max(3, options.numWords));

  for (let i = 0; i < numWords; i++) {
    const randomArray = new Uint32Array(1);
    window.crypto.getRandomValues(randomArray);
    let word = WORD_LIST[randomArray[0] % WORD_LIST.length];

    if (options.capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  if (options.includeNumber) {
    const randomArray = new Uint32Array(1);
    window.crypto.getRandomValues(randomArray);
    const num = (randomArray[0] % 90 + 10).toString(); // 10-99
    words[words.length - 1] += num;
  }

  return words.join(options.separator);
}

/**
 * Generate secure, privacy-preserving username
 */
export function generateUsername(options: UsernameOptions = DEFAULT_USERNAME_OPTIONS): string {
  if (options.type === 'word') {
    const randomArray = new Uint32Array(2);
    window.crypto.getRandomValues(randomArray);
    let word1 = WORD_LIST[randomArray[0] % WORD_LIST.length];
    let word2 = WORD_LIST[randomArray[1] % WORD_LIST.length];

    if (options.capitalize) {
      word1 = word1.charAt(0).toUpperCase() + word1.slice(1);
      word2 = word2.charAt(0).toUpperCase() + word2.slice(1);
    }

    let username = `${word1}${options.separator}${word2}`;
    if (options.includeNumber) {
      const randNum = (randomArray[0] % 900 + 100).toString();
      username += `${options.separator}${randNum}`;
    }
    return username;
  } else {
    // Random string username
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let res = '';
    const randomArray = new Uint32Array(10);
    window.crypto.getRandomValues(randomArray);
    for (let i = 0; i < 8; i++) {
      res += chars[randomArray[i] % chars.length];
    }
    return res;
  }
}
