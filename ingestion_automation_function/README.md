# KTMB GTFS Ingestion Cloud Function

This project contains a Google Cloud Function to ingest KTMB GTFS data into a PostgreSQL database.

## Prerequisites

1.  **Google Cloud Project**: You need an active GCP project.
2.  **Cloud SQL Instance**: A PostgreSQL instance running on Cloud SQL.
3.  **gcloud CLI**: Installed and authenticated (`gcloud auth login`).

## Static IP Configuration (Optional)

If your database is on an external server (e.g., AWS EC2) and requires IP allowlisting, you must configure a Static IP for the Cloud Function using Cloud NAT.

### 1. Create a Static IP Address
```bash
gcloud compute addresses create ktmb-ingestion-ip --region=asia-southeast1
```
*Note the IP address created here. This is the IP you will allowlist in your EC2 Security Group.*

### 2. Create a Cloud Router
```bash
gcloud compute routers create ktmb-ingestion-router \
    --network=default \
    --region=asia-southeast1
```

### 3. Configure Cloud NAT
Link the NAT to the router and the static IP.
```bash
gcloud compute routers nats create ktmb-ingestion-nat \
    --router=ktmb-ingestion-router \
    --region=asia-southeast1 \
    --nat-external-ip-pool=ktmb-ingestion-ip \
    --nat-all-subnet-ip-ranges
```

### 4. Create Serverless VPC Access Connector
This bridges your Cloud Function to your VPC, allowing traffic to flow through the NAT.
```bash
gcloud compute networks vpc-access connectors create ktmb-ingestion-connector \
    --region=asia-southeast1 \
    --range=10.8.0.0/28 \
    --network=default \
    --project=ktm-schedule-app
```

## Deployment

Use the following command to deploy. If you set up the Static IP above, ensure you include the VPC flags.

```bash
gcloud functions deploy ingest_gtfs \
    --gen2 \
    --runtime=python311 \
    --region=asia-southeast1 \
    --source=. \
    --entry-point=ingest_gtfs \
    --trigger-http \
    --allow-unauthenticated \
    --set-env-vars DB_USER=postgres,DB_PASS=yourpassword,DB_NAME=ktmb_gtfs DB_HOST=your-ec2-public-ip \
    --vpc-connector=ktmb-ingestion-connector \
    --egress-settings=all
```

### Important Notes:

*   **Environment Variables**: You MUST replace the values in `--set-env-vars` with your actual database credentials.
*   `DB_HOST`: Use the **Private IP** of your Cloud SQL instance if the function is in the same VPC (requires VPC connector configuration). If using public IP (not recommended for production), ensure the function's IP is authorized. For Cloud SQL Auth Proxy or Connector, the setup might differ.
*   **VPC Connector**: If your Cloud SQL instance has only a private IP, you need to configure a Serverless VPC Access connector and add `--vpc-connector=YOUR_CONNECTOR_NAME` to the deploy command.

## Local Development

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Run Locally**:
    ```bash
    functions-framework --target=ingest_gtfs --debug
    ```
