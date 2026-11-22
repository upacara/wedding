const BASE_BLOCKED_WORDS = [
  "anjing", "anjir", "anjay", "babi", "bangsat", "bajingan", "kontol", "memek",
  "ngentot", "jancok", "jancuk", "cuk", "cok", "asu", "taek", "tai", "goblok",
  "goblog", "tolol", "idiot", "bego", "pepek", "perek", "lonte", "pelacur",
  "keparat", "brengsek", "kampret", "setan", "iblis", "monyet", "kunyuk",
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "pussy", "slut", "whore",
];

function wordToFlexibleRegex(word: string): RegExp {
  const leetMap: Record<string, string> = {
    a: "[a@4]",
    i: "[i1!|]",
    u: "[uv]",
    e: "[e3]",
    o: "[o0]",
    s: "[s$5]",
    g: "[g9nk]",
    t: "[t7]",
  };

  const pattern = word
    .toLowerCase()
    .split("")
    .map((ch) => leetMap[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s._-]*");

  return new RegExp(`\\b${pattern}\\b`, "gi");
}

export function censorProfanity(text: string, extraWords: string[] = []): string {
  if (!text) return text;
  const combined = Array.from(
    new Set([
      ...BASE_BLOCKED_WORDS,
      ...extraWords.map((w) => w.trim().toLowerCase()).filter(Boolean),
    ])
  );

  let output = text;
  for (const word of combined) {
    const regex = wordToFlexibleRegex(word);
    output = output.replace(regex, (match) => {
      if (match.length <= 2) return "*".repeat(match.length);
      return `${match[0]}${"*".repeat(match.length - 2)}${match[match.length - 1]}`;
    });
  }
  return output;
}
