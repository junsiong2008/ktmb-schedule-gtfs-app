# KTMB GTFS Ingestion Service Design

## Overview
This service is designed as a Google Cloud Function to automate the ingestion and parsing of KTMB GTFS static data. It downloads the latest GTFS data, parses the standard GTFS files, and updates a PostgreSQL database.

## Architecture
- **Runtime**: Python 3.11+
- **Deployment**: Google Cloud Functions (2nd Gen)
- **Trigger**: HTTP Trigger (can be scheduled via Cloud Scheduler) or Pub/Sub.
- **Database**: PostgreSQL (Cloud SQL).
- **ORM**: SQLAlchemy.

## Data Source
- **URL**: `https://api.data.gov.my/gtfs-static/ktmb`
- **Format**: GTFS Static (ZIP file containing CSVs).

## Data Model (Schema)
The database schema follows the General Transit Feed Specification (GTFS).

### Tables
1.  **agency**
    - `agency_id` (PK)
    - `agency_name`
    - `agency_url`
    - `agency_timezone`
    - `agency_lang`
    - `agency_phone`

2.  **stops**
    - `stop_id` (PK)
    - `stop_code`
    - `stop_name`
    - `stop_lat`
    - `stop_lon`
    - `location_type`
    - `parent_station`

3.  **routes**
    - `route_id` (PK)
    - `agency_id` (FK)
    - `route_short_name`
    - `route_long_name`
    - `route_type`
    - `route_color`
    - `route_text_color`

4.  **trips**
    - `trip_id` (PK)
    - `route_id` (FK)
    - `service_id` (FK)
    - `trip_headsign`
    - `direction_id`
    - `shape_id`

5.  **stop_times**
    - `trip_id` (FK, Composite PK)
    - `stop_id` (FK, Composite PK)
    - `stop_sequence` (Composite PK)
    - `arrival_time`
    - `departure_time`
    - `pickup_type`
    - `drop_off_type`

6.  **calendar** (Service availability)
    - `service_id` (PK)
    - `monday`..`sunday` (boolean)
    - `start_date`
    - `end_date`

7.  **calendar_dates** (Exceptions)
    - `service_id` (FK)
    - `date`
    - `exception_type`

8.  **shapes** (Optional, but good for maps)
    - `shape_id` (Composite PK)
    - `shape_pt_lat`
    - `shape_pt_lon`
    - `shape_pt_sequence` (Composite PK)

## Ingestion Logic
1.  **Download**: Fetch ZIP from URL.
2.  **Extract**: Unzip to temporary storage (`/tmp`).
3.  **Process**:
    - Iterate through defined GTFS files.
    - Read CSV using pandas or standard csv module.
    - Clean/Validate data.
    - **Upsert Strategy**:
        - Since GTFS data updates can be full replacements or deltas, a full replacement for the active feed version is often safest, but for a persistent DB, we might want to use `upsert` or clear-and-insert for static tables (routes, stops) and careful handling for large tables (stop_times).
        - *Simplification for MVP*: Truncate tables and bulk insert new data to ensure consistency with the latest feed. (Or use a transaction to swap tables).

## Dependencies
- `functions-framework`
- `sqlalchemy`
- `psycopg2-binary`
- `requests`
- `pandas` (optional, but makes CSV handling easier)
