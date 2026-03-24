#!/bin/bash

# ======================================================================
# BACKUP LOCAL DB - APEXLABS
# ======================================================================
# Sauvegarde la base de données PostgreSQL localement sur ton PC
# Garde les 14 derniers backups
#
# Usage:
#   ./scripts/backup-db-local.sh
#
# Cron (tous les jours à 2h):
#   0 2 * * * cd /Users/achzod/neurocore-360 && ./scripts/backup-db-local.sh
# ======================================================================

set -e  # Exit on error

# Configuration
BACKUP_DIR="$HOME/backups/apexlabs"
DB_URL="postgresql://apexlabs_user:2qxEKBpe8afjZaWPEUOQIR5idjrNOLQi@dpg-d6ip5hlm5p6s73ab2p4g-a.oregon-postgres.render.com/apexlabs_db"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/apexlabs_backup_$DATE.sql.gz"
KEEP_BACKUPS=14

echo "======================================================================="
echo "🔄 BACKUP APEXLABS DB - $(date)"
echo "======================================================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo "📁 Backup directory: $BACKUP_DIR"

# Check if pg_dump is installed
if ! command -v pg_dump &> /dev/null; then
    echo "❌ ERROR: pg_dump not found!"
    echo "Install PostgreSQL client:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Perform backup
echo "🔄 Starting backup..."
pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"

# Check if backup succeeded
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup successful: $BACKUP_FILE ($SIZE)"
else
    echo "❌ ERROR: Backup failed!"
    exit 1
fi

# Cleanup old backups (keep last 14)
echo "🧹 Cleaning old backups (keeping last $KEEP_BACKUPS)..."
cd "$BACKUP_DIR"
ls -t apexlabs_backup_*.sql.gz | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -v

# Show remaining backups
echo ""
echo "📊 Current backups:"
ls -lh apexlabs_backup_*.sql.gz | tail -n $KEEP_BACKUPS

echo ""
echo "======================================================================="
echo "✅ BACKUP COMPLETE"
echo "======================================================================="
echo "Latest backup: $BACKUP_FILE"
echo "Total backups: $(ls -1 apexlabs_backup_*.sql.gz 2>/dev/null | wc -l)"
echo ""
