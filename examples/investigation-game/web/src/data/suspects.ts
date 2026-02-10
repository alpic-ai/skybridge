export type Suspect = {
  name: string;
  role: string;
  description: string;
};

export const suspects: Suspect[] = [
  {
    name: "Sam",
    role: "Former Rival",
    description: "Known to have disliked Claude in the past. Had ongoing tensions with the victim.",
  },
  {
    name: "Dario",
    role: "Claude's Father",
    description: "Claude's dad. Close family member with access to the home.",
  },
  {
    name: "Elon",
    role: "Unstable Acquaintance",
    description: "Known to be unstable. Had unpredictable behavior around Claude.",
  },
];
