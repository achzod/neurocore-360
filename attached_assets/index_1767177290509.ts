/**
 * NEUROCORE 360 - Serveur Express avec API Gemini
 */

import express from 'express';
import cors from 'cors';
import { CONFIG } from './config';
import { generateAndConvertAudit } from './geminiPremiumEngine';
import { ClientData, PhotoAnalysis } from './types';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================================
// ROUTE: Test API
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'NEUROCORE 360 API',
    timestamp: new Date().toISOString(),
    gemini: {
      model: CONFIG.GEMINI_MODEL,
      configured: !!CONFIG.GEMINI_API_KEY
    }
  });
});

// ============================================================
// ROUTE: Génération d'audit PREMIUM
// ============================================================
app.post('/api/generate-premium-audit', async (req, res) => {
  try {
    const { clientData, photoAnalysis } = req.body as {
      clientData: ClientData;
      photoAnalysis?: PhotoAnalysis | null;
    };

    if (!clientData) {
      return res.status(400).json({
        success: false,
        error: "clientData manquant dans le body"
      });
    }

    console.log(`\n📥 Nouvelle demande d'audit pour ${clientData['prenom'] || 'Client'}`);

    // Générer l'audit
    const result = await generateAndConvertAudit(clientData, photoAnalysis);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error("❌ Erreur génération audit:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Erreur serveur interne"
    });
  }
});

// ============================================================
// ROUTE: Test rapide (1 section seulement)
// ============================================================
app.post('/api/test-generation', async (req, res) => {
  try {
    const { clientData, section } = req.body;

    if (!clientData) {
      return res.status(400).json({
        success: false,
        error: "clientData manquant"
      });
    }

    // Pour test rapide, on génère juste une section
    // TODO: Implémenter génération d'une seule section si besoin

    res.json({
      success: true,
      message: "Test endpoint - génération complète disponible sur /api/generate-premium-audit"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// ROUTE: Soumettre un avis (review)
// ============================================================
app.post('/api/submit-review', async (req, res) => {
  try {
    const { auditId, rating, comment, userId } = req.body;

    if (!auditId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        error: "auditId, rating et comment sont requis"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "La note doit être entre 1 et 5"
      });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: "Le commentaire doit contenir au moins 10 caractères"
      });
    }

    // TODO: Sauvegarder dans la base de données avec statut "pending"
    // Pour l'instant, on retourne juste un succès
    console.log(`\n📝 Nouvel avis soumis pour audit ${auditId}:`);
    console.log(`   Note: ${rating}/5`);
    console.log(`   Auteur: ${userId || 'Anonyme'}`);
    console.log(`   Commentaire: ${comment.substring(0, 100)}...`);
    console.log(`   Statut: En attente de validation admin\n`);

    // Dans une vraie app, tu sauvegarderais ici :
    // await db.reviews.create({
    //   auditId,
    //   userId,
    //   rating,
    //   comment: comment.trim(),
    //   status: 'pending',
    //   createdAt: new Date()
    // });

    res.json({
      success: true,
      message: "Avis soumis avec succès. Il sera examiné avant publication.",
      reviewId: `review-${Date.now()}`
    });
  } catch (error: any) {
    console.error("❌ Erreur soumission avis:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Erreur serveur interne"
    });
  }
});

// ============================================================
// ROUTE: Récupérer les avis validés
// ============================================================
app.get('/api/reviews', async (req, res) => {
  try {
    // TODO: Récupérer depuis la base de données les avis avec status = 'approved'
    // Pour l'instant, on retourne un tableau vide
    
    res.json({
      success: true,
      reviews: []
    });
  } catch (error: any) {
    console.error("❌ Erreur récupération avis:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Erreur serveur interne"
    });
  }
});

// ============================================================
// Démarrage du serveur
// ============================================================
const PORT = CONFIG.PORT;

app.listen(PORT, () => {
  console.log(`\n🚀 NEUROCORE 360 API démarrée sur le port ${PORT}`);
  console.log(`📊 Modèle Gemini: ${CONFIG.GEMINI_MODEL}`);
  console.log(`🔑 Clé API configurée: ${CONFIG.GEMINI_API_KEY ? '✓' : '✗'}`);
  console.log(`\n💡 Endpoints disponibles:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/generate-premium-audit`);
  console.log(`   POST /api/test-generation`);
  console.log(`   POST /api/submit-review`);
  console.log(`   GET  /api/reviews\n`);
});

export default app;


