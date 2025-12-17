#!/bin/bash

# Configuration
PROJECT_ID="your-project-id"
REGION="asia-southeast1"
DB_INSTANCE_CONNECTION_NAME="project:region:instance"
DB_USER="postgres"
DB_PASS="password"
DB_NAME="ktmb_gtfs"

# Deploy
gcloud functions deploy ingest_gtfs \
    --gen2 \
    --runtime=python311 \
    --region=$REGION \
    --source=. \
    --entry-point=ingest_gtfs \
    --trigger-http \
    --allow-unauthenticated \
    --set-env-vars DB_USER=$DB_USER,DB_PASS=$DB_PASS,DB_NAME=$DB_NAME,DB_HOST=/cloudsql/$DB_INSTANCE_CONNECTION_NAME \
    --project=$PROJECT_ID
