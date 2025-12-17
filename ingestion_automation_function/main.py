import functions_framework
import requests
import zipfile
import os
import pandas as pd
import io
import logging
from sqlalchemy import text
from database import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GTFS_URL = "https://api.data.gov.my/gtfs-static/ktmb"

# Define expected columns for each table to ensure schema compliance
TABLE_COLUMNS = {
    'agency': ['agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone'],
    'stops': ['stop_id', 'stop_code', 'stop_name', 'stop_lat', 'stop_lon', 'location_type', 'parent_station'],
    'routes': ['route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_desc', 'route_type', 'route_url', 'route_color', 'route_text_color'],
    'calendar': ['service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date'],
    'trips': ['trip_id', 'route_id', 'service_id', 'trip_headsign', 'direction_id', 'shape_id'],
    'stop_times': ['trip_id', 'stop_id', 'stop_sequence', 'arrival_time', 'departure_time', 'pickup_type', 'drop_off_type', 'shape_dist_traveled']
}

@functions_framework.http
def ingest_gtfs(request):
    """HTTP Cloud Function to trigger GTFS ingestion."""
    try:
        logger.info("Starting GTFS ingestion...")
        
        # 1. Download ZIP
        logger.info(f"Downloading GTFS data from {GTFS_URL}...")
        response = requests.get(GTFS_URL)
        response.raise_for_status()
        zip_content = io.BytesIO(response.content)
        
        # 2. Extract and Process
        with zipfile.ZipFile(zip_content) as z:
            # Create tables using schema.sql
            with open('schema.sql', 'r') as f:
                schema_sql = f.read()
            
            with engine.connect() as connection:
                trans = connection.begin()
                try:
                    # Apply Schema
                    logger.info("Applying database schema...")
                    connection.execute(text(schema_sql))
                    
                    # Clear existing data (Order matters due to FKs)
                    logger.info("Clearing existing data...")
                    # Removed shapes and calendar_dates from TRUNCATE
                    connection.execute(text("TRUNCATE TABLE stop_times, trips, calendar, routes, stops, agency CASCADE;"))
                    
                    # Helper to read and insert
                    def process_file(filename, table_name):
                        if filename in z.namelist():
                            logger.info(f"Processing {filename} into {table_name}...")
                            with z.open(filename) as f:
                                df = pd.read_csv(f, dtype=str) # Read as string to preserve formatting
                                
                                # 1. Filter/Fill Columns
                                expected_cols = TABLE_COLUMNS.get(table_name, [])
                                if expected_cols:
                                    # Add missing columns with None
                                    for col in expected_cols:
                                        if col not in df.columns:
                                            df[col] = None
                                    # Keep only expected columns
                                    df = df[expected_cols]
                                
                                # 2. Type Conversions
                                numeric_cols = [
                                    'stop_lat', 'stop_lon', 'shape_pt_lat', 'shape_pt_lon', 
                                    'shape_pt_sequence', 'stop_sequence', 'direction_id', 
                                    'pickup_type', 'drop_off_type', 'route_type', 
                                    'location_type', 'exception_type', 'shape_dist_traveled'
                                ]
                                for col in numeric_cols:
                                    if col in df.columns:
                                        df[col] = pd.to_numeric(df[col], errors='coerce')
                                
                                # Boolean conversion for calendar
                                bool_cols = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                                for col in bool_cols:
                                    if col in df.columns:
                                        # Map '1' to True, '0' to False. 
                                        df[col] = df[col].apply(lambda x: True if str(x).strip() == '1' else False)

                                # Date conversion (YYYYMMDD -> YYYY-MM-DD)
                                date_cols = ['start_date', 'end_date', 'date']
                                for col in date_cols:
                                    if col in df.columns:
                                        df[col] = pd.to_datetime(df[col], format='%Y%m%d', errors='coerce').dt.date

                                # 3. Bulk insert
                                df.to_sql(table_name, connection, if_exists='append', index=False, chunksize=1000)
                        else:
                            logger.warning(f"{filename} not found in ZIP.")

                    # Order matters!
                    process_file('agency.txt', 'agency')
                    process_file('stops.txt', 'stops')
                    process_file('routes.txt', 'routes')
                    process_file('calendar.txt', 'calendar')
                    # process_file('calendar_dates.txt', 'calendar_dates') # Not in KTMB
                    # process_file('shapes.txt', 'shapes') # Not in KTMB
                    process_file('trips.txt', 'trips')
                    process_file('stop_times.txt', 'stop_times')
                    
                    trans.commit()
                    logger.info("Ingestion complete.")
                except Exception as e:
                    trans.rollback()
                    logger.error(f"Error during ingestion: {e}")
                    raise e
                    
        return "GTFS Ingestion Successful", 200
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        return f"Error: {e}", 500
