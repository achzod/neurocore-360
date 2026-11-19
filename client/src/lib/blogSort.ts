// Tri du blog : du plus récent au plus ancien.
// À date égale, l'article ajouté en dernier (id numérique le plus grand) passe devant.
type Sortable = { id: string | number; date: string };

const idRank = (id: string | number) => {
  const n = Number(id);
  return Number.isFinite(n) ? n : -1;
};

export function compareRecent(a: Sortable, b: Sortable): number {
  const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
  if (diff !== 0 && !Number.isNaN(diff)) return diff;
  return idRank(b.id) - idRank(a.id);
}
