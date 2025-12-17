-- Enable PostGIS if needed for advanced geo queries, but for basic GTFS standard types are sufficient.
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Agency
CREATE TABLE IF NOT EXISTS agency (
    agency_id TEXT PRIMARY KEY,
    agency_name TEXT NOT NULL,
    agency_url TEXT NOT NULL,
    agency_timezone TEXT NOT NULL,
    agency_lang TEXT,
    agency_phone TEXT
);

-- 2. Stops
CREATE TABLE IF NOT EXISTS stops (
    stop_id TEXT PRIMARY KEY,
    stop_code TEXT,
    stop_name TEXT NOT NULL,
    stop_lat DOUBLE PRECISION,
    stop_lon DOUBLE PRECISION,
    location_type INTEGER, -- 0: Stop, 1: Station, etc.
    parent_station TEXT -- Self-referencing FK
);

-- Add foreign key for parent_station after table creation to avoid issues during creation if referenced id doesn't exist yet (though self-ref is usually fine in CREATE TABLE if careful, ALTER is safer).
ALTER TABLE stops 
    DROP CONSTRAINT IF EXISTS fk_stops_parent_station;
ALTER TABLE stops 
    ADD CONSTRAINT fk_stops_parent_station 
    FOREIGN KEY (parent_station) 
    REFERENCES stops (stop_id);

-- 3. Routes
CREATE TABLE IF NOT EXISTS routes (
    route_id TEXT PRIMARY KEY,
    agency_id TEXT,
    route_short_name TEXT,
    route_long_name TEXT,
    route_desc TEXT,
    route_type INTEGER NOT NULL,
    route_url TEXT,
    route_color TEXT,
    route_text_color TEXT,
    FOREIGN KEY (agency_id) REFERENCES agency (agency_id)
);

-- 4. Calendar (Service Availability)
CREATE TABLE IF NOT EXISTS calendar (
    service_id TEXT PRIMARY KEY,
    monday BOOLEAN NOT NULL,
    tuesday BOOLEAN NOT NULL,
    wednesday BOOLEAN NOT NULL,
    thursday BOOLEAN NOT NULL,
    friday BOOLEAN NOT NULL,
    saturday BOOLEAN NOT NULL,
    sunday BOOLEAN NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

-- 5. Calendar Dates (Service Exceptions) - NOT IN KTMB DATA
-- CREATE TABLE IF NOT EXISTS calendar_dates (
--     id SERIAL PRIMARY KEY,
--     service_id TEXT NOT NULL,
--     date DATE NOT NULL,
--     exception_type INTEGER NOT NULL -- 1: Added, 2: Removed
-- );

-- 6. Shapes - NOT IN KTMB DATA
-- CREATE TABLE IF NOT EXISTS shapes (
--     shape_id TEXT,
--     shape_pt_lat DOUBLE PRECISION NOT NULL,
--     shape_pt_lon DOUBLE PRECISION NOT NULL,
--     shape_pt_sequence INTEGER NOT NULL,
--     PRIMARY KEY (shape_id, shape_pt_sequence)
-- );

-- 7. Trips
CREATE TABLE IF NOT EXISTS trips (
    trip_id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    trip_headsign TEXT,
    direction_id INTEGER,
    shape_id TEXT,
    FOREIGN KEY (route_id) REFERENCES routes (route_id)
);

-- 8. Stop Times
CREATE TABLE IF NOT EXISTS stop_times (
    trip_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    stop_sequence INTEGER NOT NULL,
    arrival_time TEXT, -- Keep as text to handle > 24:00:00
    departure_time TEXT,
    pickup_type INTEGER,
    drop_off_type INTEGER,
    shape_dist_traveled DOUBLE PRECISION,
    PRIMARY KEY (trip_id, stop_sequence)
    -- FOREIGN KEY (trip_id) REFERENCES trips (trip_id),
    -- FOREIGN KEY (stop_id) REFERENCES stops (stop_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stops_parent_station ON stops(parent_station);
CREATE INDEX IF NOT EXISTS idx_routes_agency_id ON routes(agency_id);
CREATE INDEX IF NOT EXISTS idx_trips_route_id ON trips(route_id);
CREATE INDEX IF NOT EXISTS idx_trips_service_id ON trips(service_id);
CREATE INDEX IF NOT EXISTS idx_stop_times_trip_id ON stop_times(trip_id);
CREATE INDEX IF NOT EXISTS idx_stop_times_stop_id ON stop_times(stop_id);
CREATE INDEX IF NOT EXISTS idx_stop_times_arrival_time ON stop_times(arrival_time);
