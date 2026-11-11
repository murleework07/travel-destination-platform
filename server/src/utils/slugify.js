// "Kerala Backwaters!" -> "kerala-backwaters", "Taj_Mahal" -> "taj-mahal"
export function slugify(text) {
  return text
    .toString()
    .normalize('NFKD')                // split accented letters: é -> e + ´
    .replace(/[\u0300-\u036f]/g, '')  // remove the accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')    // remove special characters (keep spaces, _ and -)
    .replace(/[\s_-]+/g, '-')         // spaces/underscores/dashes -> single dash
    .replace(/^-+|-+$/g, '');         // trim dashes from both ends
}