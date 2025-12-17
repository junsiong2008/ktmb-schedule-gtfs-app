from sqlalchemy import Column, String, Integer, Float, Boolean, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from ingestion_automation_function.database import Base

class Agency(Base):
    __tablename__ = "agency"

    agency_id = Column(String, primary_key=True)
    agency_name = Column(String, nullable=False)
    agency_url = Column(String, nullable=False)
    agency_timezone = Column(String, nullable=False)
    agency_lang = Column(String, nullable=True)
    agency_phone = Column(String, nullable=True)

class Stop(Base):
    __tablename__ = "stops"

    stop_id = Column(String, primary_key=True)
    stop_code = Column(String, nullable=True)
    stop_name = Column(String, nullable=False)
    stop_lat = Column(Float, nullable=False)
    stop_lon = Column(Float, nullable=False)
    location_type = Column(Integer, nullable=True)
    parent_station = Column(String, nullable=True)

class Route(Base):
    __tablename__ = "routes"

    route_id = Column(String, primary_key=True)
    agency_id = Column(String, ForeignKey("agency.agency_id"), nullable=True)
    route_short_name = Column(String, nullable=True)
    route_long_name = Column(String, nullable=True)
    route_desc = Column(Text, nullable=True)
    route_type = Column(Integer, nullable=False)
    route_url = Column(String, nullable=True)
    route_color = Column(String, nullable=True)
    route_text_color = Column(String, nullable=True)

class Calendar(Base):
    __tablename__ = "calendar"

    service_id = Column(String, primary_key=True)
    monday = Column(Boolean, nullable=False)
    tuesday = Column(Boolean, nullable=False)
    wednesday = Column(Boolean, nullable=False)
    thursday = Column(Boolean, nullable=False)
    friday = Column(Boolean, nullable=False)
    saturday = Column(Boolean, nullable=False)
    sunday = Column(Boolean, nullable=False)
    start_date = Column(String, nullable=False) # YYYYMMDD
    end_date = Column(String, nullable=False)   # YYYYMMDD

class CalendarDate(Base):
    __tablename__ = "calendar_dates"

    service_id = Column(String, primary_key=True) # Composite PK part 1 usually, but simplified here. Actually needs composite.
    date = Column(String, primary_key=True)       # Composite PK part 2
    exception_type = Column(Integer, nullable=False)

class Shape(Base):
    __tablename__ = "shapes"

    shape_id = Column(String, primary_key=True)
    shape_pt_lat = Column(Float, nullable=False)
    shape_pt_lon = Column(Float, nullable=False)
    shape_pt_sequence = Column(Integer, primary_key=True)

class Trip(Base):
    __tablename__ = "trips"

    trip_id = Column(String, primary_key=True)
    route_id = Column(String, ForeignKey("routes.route_id"), nullable=False)
    service_id = Column(String, nullable=False) # Usually FK to calendar, but calendar is optional if calendar_dates exists.
    trip_headsign = Column(String, nullable=True)
    trip_short_name = Column(String, nullable=True)
    direction_id = Column(Integer, nullable=True)
    block_id = Column(String, nullable=True)
    shape_id = Column(String, nullable=True) # FK to shapes usually, but shapes is composite.

class StopTime(Base):
    __tablename__ = "stop_times"

    trip_id = Column(String, ForeignKey("trips.trip_id"), primary_key=True)
    arrival_time = Column(String, nullable=True) # HH:MM:SS (can be > 24:00:00)
    departure_time = Column(String, nullable=True)
    stop_id = Column(String, ForeignKey("stops.stop_id"), primary_key=True)
    stop_sequence = Column(Integer, primary_key=True)
    stop_headsign = Column(String, nullable=True)
    pickup_type = Column(Integer, nullable=True)
    drop_off_type = Column(Integer, nullable=True)
    shape_dist_traveled = Column(Float, nullable=True)
