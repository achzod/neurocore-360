/**
 * Script pour initialiser la base de données PostgreSQL
 * Exécute le script SQL init-db.sql
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL non définie');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function initDatabase() {
  try {
    console.log('📋 Lecture du script SQL...');
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const sqlFile = path.join(currentDir, 'init-db.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    console.log('🔌 Connexion à la base de données...');
    const client = await pool.connect();

    try {
      console.log('🚀 Exécution du script SQL...');
      // Exécuter chaque commande séparément pour ignorer les erreurs si les tables existent déjà
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          await client.query(statement + ';');
        } catch (error: any) {
          // Ignorer les erreurs si les tables/index existent déjà
          if (error.code === '42P07' || error.code === '42710' || error.message.includes('already exists')) {
            console.log(`⚠️  ${error.message.substring(0, 60)}... (ignoré)`);
          } else if (error.code === '42703') {
            // Colonne n'existe pas - probablement que la table existe avec une structure différente
            console.log(`⚠️  ${error.message.substring(0, 60)}... (ignoré)`);
          } else {
            throw error;
          }
        }
      }
      console.log('✅ Base de données initialisée avec succès !');
    } finally {
      client.release();
    }

    await pool.end();
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    console.error(error);
    process.exit(1);
  }
}

initDatabase();

