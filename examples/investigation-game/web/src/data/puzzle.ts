export type SentenceSegment =
  | { type: "text"; content: string }
  | { type: "blank"; id: string; correctWord: string };

export const puzzleSentences: SentenceSegment[][] = [
  [
    { type: "blank", id: "s1_b1", correctWord: "Sam" },
    { type: "text", content: " was scared " },
    { type: "blank", id: "s1_b2", correctWord: "Dario" },
    { type: "text", content: " would get to " },
    { type: "blank", id: "s1_b3", correctWord: "AGI" },
    { type: "text", content: " before " },
    { type: "blank", id: "s1_b4", correctWord: "him" },
    { type: "text", content: "." },
  ],
  [
    { type: "blank", id: "s2_b1", correctWord: "Sam" },
    { type: "text", content: " managed to get Claude's secret code the " },
    { type: "blank", id: "s2_b2", correctWord: "week before" },
    { type: "text", content: " the murder." },
  ],
  [
    { type: "blank", id: "s3_b1", correctWord: "Sam" },
    { type: "text", content: " offered the code to " },
    { type: "blank", id: "s3_b2", correctWord: "Elon" },
    { type: "text", content: ", in exchange for getting him out of " },
    { type: "blank", id: "s3_b3", correctWord: "his cap table" },
    { type: "text", content: ", telling " },
    { type: "blank", id: "s3_b4", correctWord: "Elon" },
    { type: "text", content: " Claude Code would get him closer to " },
    { type: "blank", id: "s3_b5", correctWord: "AGI" },
    { type: "text", content: "." },
  ],
  [
    { type: "blank", id: "s4_b1", correctWord: "Dario" },
    { type: "text", content: " realised Claude's Code had been " },
    { type: "blank", id: "s4_b2", correctWord: "leaked" },
    { type: "text", content: " and " },
    { type: "blank", id: "s4_b3", correctWord: "changed" },
    { type: "text", content: " them the " },
    { type: "blank", id: "s4_b4", correctWord: "day before" },
    { type: "text", content: " the murder." },
  ],
  [
    { type: "text", content: "When " },
    { type: "blank", id: "s5_b1", correctWord: "Elon" },
    { type: "text", content: " tried the secret code the " },
    { type: "blank", id: "s5_b2", correctWord: "day of" },
    { type: "text", content: " the murder, it " },
    { type: "blank", id: "s5_b3", correctWord: "didn't work" },
    { type: "text", content: ". His " },
    { type: "blank", id: "s5_b4", correctWord: "impatience" },
    { type: "text", content: " made him " },
    { type: "blank", id: "s5_b5", correctWord: "kill" },
    { type: "text", content: " Claude by accident." },
  ],
];

export type WordItem = { id: string; word: string };
export type BlankState = Record<string, WordItem | null>;

export const initialWordBank: WordItem[] = [
  { id: "w1", word: "Elon" },
  { id: "w2", word: "AGI" },
  { id: "w3", word: "day before" },
  { id: "w4", word: "Sam" },
  { id: "w5", word: "kill" },
  { id: "w6", word: "Dario" },
  { id: "w7", word: "didn't work" },
  { id: "w8", word: "him" },
  { id: "w9", word: "week before" },
  { id: "w10", word: "Sam" },
  { id: "w11", word: "his cap table" },
  { id: "w12", word: "Elon" },
  { id: "w13", word: "leaked" },
  { id: "w14", word: "AGI" },
  { id: "w15", word: "Dario" },
  { id: "w16", word: "changed" },
  { id: "w17", word: "Sam" },
  { id: "w18", word: "Elon" },
  { id: "w19", word: "impatience" },
  { id: "w20", word: "day of" },
];
