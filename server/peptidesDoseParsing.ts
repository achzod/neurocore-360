export function extractOperationalDoseMgValues(value: unknown): number[] {
  const raw = String(value || "").replace(/(\d),(\d)/g, "$1.$2");
  const matches = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\b/gi)];
  const values: number[] = [];
  for (const match of matches) {
    const index = match.index || 0;
    const prefix = raw.slice(Math.max(0, index - 60), index);
    const suffix = raw.slice(index + match[0].length, index + match[0].length + 45);
    const aggregatePrefix = /(?:total(?:\s+du)?\s+cycle|total\s+actif|total\s+(?:journali(?:er|[èe]re)|hebdomadaire)|besoin\s+actif|quantit[ée]\s+active|cible(?:\s+avec)?\s+r[ée]serve|r[ée]serve|cumul(?:[ée]e)?|dose\s+(?:journali[èe]re|hebdomadaire))[^.;,\n]{0,24}$/i.test(prefix);
    const aggregateSuffix = /^\s*(?:au\s+total|sur\s+(?:le\s+)?cycle|pour\s+(?:le\s+)?cycle|de\s+r[ée]serve)\b/i.test(suffix);
    const cadenceSuffix = /^\s*(?:par\s+(?:jour|semaine)|\/(?:j(?:our)?|sem(?:aine)?)|hebdomadaire)\b/i.test(suffix);
    const priorDoseInClause = /\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ug)\b[^.;\n]{0,55}$/i.test(prefix);
    const titrationTransition = /(?:\b(?:puis|ensuite|apr[eè]s|[àa]\s+partir)\b|\b(?:s|sem(?:aine)?)\s*\d+)\s*[^.;,\n]{0,20}$/i.test(prefix);
    const derivedCadenceTotal = cadenceSuffix
      && !titrationTransition
      && (/(?:\bsoit|=|total|cumul)[^.;,\n]{0,16}$/i.test(prefix) || priorDoseInClause);
    if (aggregatePrefix || aggregateSuffix || derivedCadenceTotal) continue;
    const amount = Number(match[1]);
    const mg = /^mg$/i.test(match[2]) ? amount : amount / 1000;
    if (Number.isFinite(mg) && mg > 0) values.push(mg);
  }
  return [...new Set(values.map((value) => Number(value.toFixed(9))))];
}

export function selectHighestOperationalDoseMg(value: unknown): number | null {
  const values = extractOperationalDoseMgValues(value);
  return values.length ? Math.max(...values) : null;
}
