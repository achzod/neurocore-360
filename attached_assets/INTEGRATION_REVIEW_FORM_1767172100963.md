# Intégration du ReviewForm dans la page de rapport

## Utilisation du composant ReviewForm

Pour intégrer le formulaire d'avis à la fin d'un rapport d'audit, voici un exemple :

```tsx
import ReviewForm from '../components/ReviewForm';

// Dans votre composant de rapport
const AuditDetailPage: React.FC<{ auditId: string }> = ({ auditId }) => {
  const handleReviewSubmit = async (review: { rating: number; comment: string }) => {
    try {
      const response = await fetch('/api/submit-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auditId,
          rating: review.rating,
          comment: review.comment,
          userId: 'user-id-here' // À récupérer depuis l'auth
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la soumission');
      }

      // Gérer le succès (le composant ReviewForm affiche déjà le message de succès)
    } catch (error) {
      throw error; // Le composant gère l'erreur
    }
  };

  return (
    <div>
      {/* Contenu du rapport */}
      <div dangerouslySetInnerHTML={{ __html: auditHtml }} />
      
      {/* Formulaire d'avis à la fin */}
      <ReviewForm 
        auditId={auditId} 
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};
```

## Structure de données des avis

Les avis sont stockés avec cette structure :
- `auditId`: ID de l'audit
- `userId`: ID de l'utilisateur (optionnel)
- `rating`: Note entre 1 et 5
- `comment`: Commentaire (minimum 10 caractères)
- `status`: 'pending' | 'approved' | 'rejected'
- `createdAt`: Date de création
- `reviewedAt`: Date de validation/rejet (par admin)
- `reviewedBy`: ID de l'admin qui a validé/rejeté

## Dashboard Admin

Pour valider/rejeter les avis, tu devras créer une interface admin avec :
- Liste des avis en attente (status = 'pending')
- Boutons "Approuver" / "Rejeter"
- Prévisualisation de l'avis (note, commentaire, date)
- Option de modifier le commentaire si nécessaire

## Endpoint Admin (à créer)

```typescript
// POST /api/admin/reviews/:reviewId/approve
// POST /api/admin/reviews/:reviewId/reject
```

