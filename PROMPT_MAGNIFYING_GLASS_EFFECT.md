# PROMPT: Effet "Magnifying Glass" sur Texte Hero (Style Ultrahuman/Apple)

## Contexte
Créer un effet de loupe interactive sur un texte hero massif où le texte est flou par défaut, et devient ultra-net uniquement dans une zone circulaire qui suit le curseur de la souris. Un point lumineux stylisé apparaît au niveau du curseur.

---

## Architecture Technique: Système 3-Layer

### Layer 1: BASE BLUR (Toujours visible)
```typescript
<h1
  className="absolute inset-0 pointer-events-none"
  style={{
    color: "hsl(160, 84%, 39%)",
    filter: "blur(6px)",
    opacity: 0.6,
  }}
  aria-hidden="true"
>
  Hack ta biologie.<br />Débloque ta performance.
</h1>
```

**Rôle:** Texte de fond flou permanent
- `position: absolute` + `inset-0` pour couvrir tout le conteneur
- `pointer-events-none` pour ne pas bloquer les interactions
- `filter: blur(6px)` pour créer l'effet de flou gaussien
- `opacity: 0.6` pour le rendre légèrement transparent
- `aria-hidden="true"` car c'est purement décoratif

---

### Layer 2: SHARP REVEAL (Révélé par masque radial)
```typescript
<h1
  className="relative z-10"
  style={{
    color: "hsl(160, 84%, 39%)",
    filter: "blur(0px)",
    opacity: 1,
    textShadow: "0 0 40px rgba(16, 185, 129, 0.5)",
    WebkitMaskImage: isHovered
      ? `radial-gradient(circle 160px at var(--x) var(--y), black 30%, transparent 100%)`
      : "none",
    maskImage: isHovered
      ? `radial-gradient(circle 160px at var(--x) var(--y), black 30%, transparent 100%)`
      : "none",
  }}
>
  Hack ta biologie.<br />Débloque ta performance.
</h1>
```

**Rôle:** Texte 100% net révélé uniquement dans la zone loupe
- `filter: blur(0px)` + `opacity: 1` = texte parfaitement net
- `textShadow` pour ajouter un glow autour du texte révélé
- **CLEF:** `mask-image` avec `radial-gradient` qui crée une "fenêtre" circulaire
  - `circle 160px` = rayon de la loupe
  - `at var(--x) var(--y)` = position dynamique suivant le curseur
  - `black 30%` = zone opaque (texte visible)
  - `transparent 100%` = transition douce vers invisible

---

### Layer 3: CURSOR DOT (Point lumineux)
```typescript
{isHovered && (
  <div
    className="absolute pointer-events-none z-30"
    style={{
      left: "var(--x)",
      top: "var(--y)",
      transform: "translate(-50%, -50%)",
    }}
  >
    <div className="relative">
      {/* Outer glow - pulse ring */}
      <div className="absolute w-12 h-12 bg-primary/30 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />

      {/* Inner dot - solid circle */}
      <div className="absolute w-3 h-3 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-primary/50" />

      {/* Center point - white core */}
      <div className="absolute w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
    </div>
  </div>
)}
```

**Rôle:** Indicateur visuel du curseur avec 3 cercles concentriques
- Glow externe (12px, blur-xl) pour l'aura
- Dot central (3px, primary) pour le point principal
- Core blanc (1px) pour le centre ultra-précis

---

## Tracking de la Souris: Les CSS Variables Dynamiques

### Hook useEffect avec requestAnimationFrame
```typescript
const textRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  let rafId: number;
  const el = textRef.current;
  if (!el) return;

  const onMove = (e: PointerEvent) => {
    rafId = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--y", `${e.clientY - rect.top}px`);
    });
  };

  el.addEventListener("pointermove", onMove);
  return () => {
    el.removeEventListener("pointermove", onMove);
    cancelAnimationFrame(rafId);
  };
}, []);
```

**Explications:**
1. **`getBoundingClientRect()`**: Récupère position/dimensions du conteneur
2. **`e.clientX - rect.left`**: Convertit position absolue → position relative au conteneur
3. **`style.setProperty("--x", ...)`**: Injecte la valeur dans une CSS variable
4. **`requestAnimationFrame`**: Optimise les performances (60fps smooth)
5. **Cleanup**: `cancelAnimationFrame` pour éviter memory leaks

---

## Structure HTML Complète

```tsx
<div
  ref={textRef}
  className="relative cursor-pointer select-none inline-block"
  style={{ "--x": "0px", "--y": "0px" } as React.CSSProperties}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  {/* Layer 1: BASE BLUR */}
  <h1 className="absolute inset-0 pointer-events-none" style={{...}}>
    Texte flou
  </h1>

  {/* Layer 2: SHARP REVEAL */}
  <h1 className="relative z-10" style={{...}}>
    Texte net
  </h1>

  {/* Layer 3: CURSOR DOT */}
  {isHovered && <div style={{...}}>Point lumineux</div>}
</div>
```

---

## Paramètres Ajustables

| Paramètre | Valeur Actuelle | Effet |
|-----------|----------------|--------|
| **Blur de base** | `6px` | Intensité du flou permanent |
| **Rayon loupe** | `160px` | Taille de la zone nette |
| **Transition gradient** | `30% → 100%` | Douceur du bord de la loupe |
| **Text-shadow** | `0 0 40px rgba(...)` | Glow autour du texte révélé |
| **Outer glow size** | `12px` (w-12 h-12) | Taille de l'aura du curseur |
| **Inner dot size** | `3px` (w-3 h-3) | Taille du point central |

---

## Notes d'Optimisation

1. **Performance**: `requestAnimationFrame` garantit 60fps
2. **Cross-browser**: Utiliser `WebkitMaskImage` ET `maskImage` pour compatibilité Safari
3. **Accessibilité**: `aria-hidden="true"` sur la layer blur pour éviter duplication screen readers
4. **Mobile**: Désactiver l'effet sur touch devices (pas de curseur)

---

## Variantes Possibles

### Variante 1: Zoom dans la loupe
```css
transform: scale(1.05); /* Sur la layer sharp */
```

### Variante 2: Loupe colorée
```css
filter: hue-rotate(30deg) saturate(1.2); /* Dans le mask */
```

### Variante 3: Multiple loupes
Dupliquer le système avec plusieurs refs et positions

---

## Résumé: L'astuce clé

**Le secret** = Avoir 2 fois le même texte superposé:
- Un flou (toujours visible)
- Un net (révélé par mask-image avec radial-gradient dynamique)

Les CSS variables `--x` et `--y` mises à jour en temps réel via JS permettent au gradient de suivre le curseur sans re-render React.

C'est l'équivalent d'avoir une vitre givrée (texte flou) avec un trou circulaire (mask) qui se déplace et laisse voir le texte net derrière.
