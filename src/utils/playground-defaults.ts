import type { PlaygroundCategory } from "../models/playground-item.model";

export type PlaygroundSeedItem = {
  category: PlaygroundCategory;
  title: string;
  emoji?: string | null;
  example?: string | null;
  color?: string | null;
  icon?: string | null;
  lines?: string | null;
  sortOrder: number;
};

const LETTER_WORDS: Record<string, string> = {
  A: "Apple",
  B: "Ball",
  C: "Cat",
  D: "Dog",
  E: "Elephant",
  F: "Fish",
  G: "Grapes",
  H: "Hat",
  I: "Ice Cream",
  J: "Jug",
  K: "Kite",
  L: "Lion",
  M: "Monkey",
  N: "Nest",
  O: "Orange",
  P: "Parrot",
  Q: "Queen",
  R: "Rabbit",
  S: "Sun",
  T: "Tiger",
  U: "Umbrella",
  V: "Van",
  W: "Watch",
  X: "Xylophone",
  Y: "Yak",
  Z: "Zebra",
};

const WORD_CARDS: Array<{
  word: string;
  emoji: string;
  example: string;
  color: string;
}> = [
  {
    word: "Apple",
    emoji: "🍎",
    example: "I eat an apple every day.",
    color: "bg-rose-500",
  },
  {
    word: "Book",
    emoji: "📖",
    example: "She reads a book at night.",
    color: "bg-indigo-500",
  },
  {
    word: "Cat",
    emoji: "🐱",
    example: "The cat is sleeping on the sofa.",
    color: "bg-amber-500",
  },
  {
    word: "Dog",
    emoji: "🐶",
    example: "My dog loves to play fetch.",
    color: "bg-emerald-500",
  },
  {
    word: "Elephant",
    emoji: "🐘",
    example: "An elephant has a long trunk.",
    color: "bg-brand-500",
  },
  {
    word: "Flower",
    emoji: "🌸",
    example: "The flower blooms in spring.",
    color: "bg-violet-500",
  },
  {
    word: "Guitar",
    emoji: "🎸",
    example: "He plays the guitar beautifully.",
    color: "bg-rose-500",
  },
  {
    word: "House",
    emoji: "🏠",
    example: "We live in a big house.",
    color: "bg-indigo-500",
  },
];

const SENTENCE_GROUPS: Array<{
  type: string;
  icon: string;
  color: string;
  sentences: string[];
}> = [
  {
    type: "Statement",
    icon: "chatbox-ellipses-outline",
    color: "bg-brand-500",
    sentences: [
      "The sun rises in the east.",
      "Birds fly in the sky.",
      "Water is essential for life.",
    ],
  },
  {
    type: "Question",
    icon: "help-circle-outline",
    color: "bg-amber-500",
    sentences: [
      "What is your name?",
      "How are you today?",
      "Where do you live?",
    ],
  },
  {
    type: "Exclamation",
    icon: "alert-circle-outline",
    color: "bg-rose-500",
    sentences: [
      "What a beautiful day!",
      "Hurray! We won the match!",
      "Oh no! I forgot my homework!",
    ],
  },
  {
    type: "Command",
    icon: "megaphone-outline",
    color: "bg-emerald-500",
    sentences: [
      "Please sit down.",
      "Open your books to page 10.",
      "Listen carefully.",
    ],
  },
];

const SPEAK_PHRASES = [
  "Hello! How are you?",
  "I love learning!",
  "The quick brown fox jumps over the lazy dog.",
  "Practice makes perfect!",
];

export const buildDefaultPlaygroundItems = (): PlaygroundSeedItem[] => {
  const items: PlaygroundSeedItem[] = [];

  Object.entries(LETTER_WORDS).forEach(([letter, word], index) => {
    items.push({
      category: "letter",
      title: letter,
      example: word,
      sortOrder: index,
    });
  });

  WORD_CARDS.forEach((card, index) => {
    items.push({
      category: "word",
      title: card.word,
      emoji: card.emoji,
      example: card.example,
      color: card.color,
      sortOrder: index,
    });
  });

  SENTENCE_GROUPS.forEach((group, index) => {
    items.push({
      category: "sentence_group",
      title: group.type,
      icon: group.icon,
      color: group.color,
      lines: group.sentences.join("\n"),
      sortOrder: index,
    });
  });

  SPEAK_PHRASES.forEach((phrase, index) => {
    items.push({
      category: "phrase",
      title: phrase,
      sortOrder: index,
    });
  });

  return items;
};
