'use client';

import React, { useState, useEffect } from 'react';
import { getRoutes, getStations, getNextTrain, getScheduleList, Route, Station, NextTrain, ScheduleItem, RouteGroup } from '@/services/api';
import NextTrainCard from '@/components/NextTrainCard';
import ScheduleList from '@/components/ScheduleList';
import { Train, ChevronRight, MapPin, Calendar, ArrowRight } from 'lucide-react';

import Clock from '@/components/Clock';

export default function Home() {
  // State for selection flow
  const [routeGroups, setRouteGroups] = useState<RouteGroup[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedAction, setSelectedAction] = useState<'schedule' | 'trip' | null>(null);

  // Data state
  const [stations, setStations] = useState<Station[]>([]);
  const [originId, setOriginId] = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');


  // Result state
  const [nextTrain, setNextTrain] = useState<NextTrain | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Initial load: fetch routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const data = await getRoutes();
        setRouteGroups(data);
      } catch (error) {
        console.error('Failed to fetch routes', error);
      }
    };
    fetchRoutes();
  }, []);

  // When route changes, fetch stations
  useEffect(() => {
    if (selectedRoute) {
      const fetchStations = async () => {
        try {
          const data = await getStations(selectedRoute.route_id);
          setStations(data);
          // Reset downstream selections
          setOriginId('');
          setDestinationId('');

          setNextTrain(null);
          setSchedule([]);
        } catch (error) {
          console.error('Failed to fetch stations', error);
        }
      };
      fetchStations();
    }
  }, [selectedRoute]);

  // Fetch results based on action
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (selectedAction === 'trip' && originId && destinationId && selectedRoute) {
          const data = await getNextTrain(originId, destinationId, selectedRoute.route_id);
          setNextTrain(data);
          setSchedule([]); // Clear schedule
        } else if (selectedAction === 'schedule' && originId && selectedRoute) {
          // For schedule, we might need direction. 
          // If direction is not selected, maybe we just show from origin?
          // The backend getScheduleList takes (from, direction, route_id).
          // Let's pass direction if we have it.
          // The backend getScheduleList takes (from, direction, route_id).
          // We pass empty string for direction to get all schedules
          const data = await getScheduleList(originId, '', selectedRoute.route_id);
          setSchedule(data);
          setNextTrain(null); // Clear next train
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have necessary data
    if (
      (selectedAction === 'trip' && originId && destinationId) ||
      (selectedAction === 'schedule' && originId)
    ) {
      fetchData();
    }
  }, [selectedAction, originId, destinationId, selectedRoute]);



  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    setSelectedAction(null);
  };

  const resetSelection = () => {
    setSelectedRoute(null);
    setSelectedAction(null);
    setOriginId('');
    setDestinationId('');
    setDestinationId('');
    setNextTrain(null);
    setSchedule([]);
  };

  return (
    <main className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="bg-blue-600 text-white p-6 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={resetSelection}>
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Train size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Next Stop</h1>
          </div>
          <div className="flex items-center gap-3">
            <Clock />
            {selectedRoute && (
              <button onClick={resetSelection} className="text-sm bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition">
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">

        {/* Step 1: Service Sections with Routes */}
        {!selectedRoute && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {routeGroups.map((group) => (
              <section key={group.service_name}>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                  {group.service_name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.routes.map((route) => (
                    <button
                      key={route.route_id}
                      onClick={() => handleRouteSelect(route)}
                      className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all text-left flex items-center justify-between group"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {route.route_short_name}
                        </h3>
                        <p className="text-sm text-gray-500">{route.route_long_name}</p>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-blue-600 transition-colors" size={20} />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Step 3: Action Selection & Inputs */}
        {selectedRoute && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="cursor-pointer hover:text-blue-600" onClick={() => setSelectedRoute(null)}>All Services</span>
              <ChevronRight size={16} />
              <span className="font-medium text-gray-900">{selectedRoute.route_short_name}</span>
            </div>

            {/* Action Tabs */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex w-full md:w-auto">
              <button
                onClick={() => { setSelectedAction('schedule'); setNextTrain(null); }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${selectedAction === 'schedule'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Station Schedule
              </button>
              <button
                onClick={() => { setSelectedAction('trip'); setSchedule([]); }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${selectedAction === 'trip'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Plan Trip
              </button>
            </div>

            {/* Input Forms */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {selectedAction === 'schedule' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar size={20} className="text-blue-600" />
                    View Station Schedule
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Station</label>
                      <select
                        value={originId}
                        onChange={(e) => setOriginId(e.target.value)}
                        className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-gray-900"
                      >
                        <option value="">Choose a station...</option>
                        {stations.map((station) => (
                          <option key={station.station_id} value={station.station_id}>
                            {station.station_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedAction === 'trip' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin size={20} className="text-blue-600" />
                    Plan Your Trip
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                      <select
                        value={originId}
                        onChange={(e) => setOriginId(e.target.value)}
                        className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-gray-900"
                      >
                        <option value="">Start from...</option>
                        {stations.map((station) => (
                          <option key={station.station_id} value={station.station_id}>
                            {station.station_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="hidden md:flex justify-center pb-3">
                      <ArrowRight className="text-gray-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                      <select
                        value={destinationId}
                        onChange={(e) => setDestinationId(e.target.value)}
                        className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-gray-900"
                      >
                        <option value="">Go to...</option>
                        {stations.map((station) => (
                          <option key={station.station_id} value={station.station_id}>
                            {station.station_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {!selectedAction && (
                <div className="text-center py-8 text-gray-500">
                  Select an option above to continue
                </div>
              )}
            </div>

            {/* Results */}
            <div className="space-y-6">
              {loading && (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              {!loading && nextTrain && (
                <NextTrainCard nextTrain={nextTrain} isLoading={false} />
              )}

              {!loading && schedule.length > 0 && (
                <ScheduleList schedule={schedule} isLoading={false} />
              )}

              {!loading && selectedAction === 'trip' && originId && destinationId && !nextTrain && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <p className="text-gray-500">No upcoming trains found for this route.</p>
                </div>
              )}
            </div>
          </div>


        )}
      </div>
    </main >
  );
}
