-- STATS RÉELLES APEXLABS
-- Exécute ce fichier sur Render SQL Console

-- Nombre total de commandes
SELECT 'TOTAL COMMANDES' as metric, COUNT(*) as value
FROM orders
WHERE status = 'completed'
UNION ALL

-- Commandes par produit
SELECT
  audit_type as metric,
  COUNT(*)::text as value
FROM orders
WHERE status = 'completed'
GROUP BY audit_type

UNION ALL

-- Revenus par produit
SELECT
  CONCAT(audit_type, ' (revenus)') as metric,
  CONCAT(SUM(amount)::text, '€') as value
FROM orders
WHERE status = 'completed'
GROUP BY audit_type

UNION ALL

-- Revenus totaux
SELECT
  'REVENUS TOTAUX' as metric,
  CONCAT(SUM(amount)::text, '€') as value
FROM orders
WHERE status = 'completed'

UNION ALL

-- Nombre d'avis validés (vrais)
SELECT
  'AVIS VALIDÉS' as metric,
  COUNT(*)::text as value
FROM reviews
WHERE approved = true

UNION ALL

-- Note moyenne
SELECT
  'NOTE MOYENNE' as metric,
  CONCAT(ROUND(AVG(rating)::numeric, 2)::text, '/5') as value
FROM reviews
WHERE approved = true

ORDER BY metric;
