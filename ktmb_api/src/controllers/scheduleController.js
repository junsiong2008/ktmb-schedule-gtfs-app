const db = require('../config/db');
const { getCurrentTimeHHMMSS, getCurrentDate, getCurrentDayName } = require('../utils/timeUtils');

const getRoutes = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM routes ORDER BY route_type, route_short_name');
        const routes = result.rows;

        const groupedRoutes = [
            { service_name: 'KTM Komuter', routes: [] },
            { service_name: 'ETS', routes: [] },
            { service_name: 'Intercity', routes: [] }
        ];

        routes.forEach(route => {
            if (route.route_type === 0) {
                groupedRoutes[0].routes.push(route);
            } else if (route.route_short_name === 'ETS') {
                groupedRoutes[1].routes.push(route);
            } else {
                groupedRoutes[2].routes.push(route);
            }
        });

        // Remove empty groups if any (optional, but good for cleanliness)
        const finalRoutes = groupedRoutes.filter(group => group.routes.length > 0);

        res.json(finalRoutes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getStations = async (req, res) => {
    const { route_id } = req.query;

    try {
        let query = 'SELECT * FROM stops';
        let params = [];

        if (route_id) {
            query = `
                SELECT DISTINCT s.* 
                FROM stops s
                JOIN stop_times st ON s.stop_id = st.stop_id
                JOIN trips t ON st.trip_id = t.trip_id
                WHERE t.route_id = $1
            `;
            params.push(route_id);
        }

        query += ' ORDER BY stop_name';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getNextTrain = async (req, res) => {
    const { from, to, route_id } = req.query;

    if (!from || !to) {
        return res.status(400).json({ error: 'Missing "from" or "to" station ID' });
    }

    const currentTime = getCurrentTimeHHMMSS();
    const currentDate = getCurrentDate();
    const currentDay = getCurrentDayName();

    // We need to filter by the current day of the week column in the calendar table.
    // Since we can't use a parameter for a column name, we validate the day name (trusted from internal util)
    // and interpolate it.

    let params = [from, to, currentTime, currentDate];

    let query = `
    SELECT
        t.trip_id,
        st_a.departure_time as departure_time,
        st_b.arrival_time as arrival_time,
        r.route_long_name,
        r.route_short_name,
        r.route_type,
        (
            SELECT s_last.stop_name 
            FROM stop_times st_last
            JOIN stops s_last ON st_last.stop_id = s_last.stop_id
            WHERE st_last.trip_id = t.trip_id
            ORDER BY st_last.stop_sequence DESC
            LIMIT 1
        ) as trip_headsign
    FROM trips t
    JOIN stop_times st_a ON t.trip_id = st_a.trip_id
    JOIN stop_times st_b ON t.trip_id = st_b.trip_id
    JOIN routes r ON t.route_id = r.route_id
    JOIN calendar c ON t.service_id = c.service_id
    WHERE st_a.stop_id = $1
      AND st_b.stop_id = $2
      AND st_a.stop_sequence < st_b.stop_sequence
      AND st_a.departure_time >= $3
      AND c.${currentDay} = true
      AND c.start_date <= $4
      AND c.end_date >= $4
  `;

    if (route_id) {
        query += ` AND t.route_id = $5`;
        params.push(route_id);
    }

    query += `
    ORDER BY st_a.departure_time ASC
    LIMIT 1;
  `;

    try {
        const result = await db.query(query, params);
        if (result.rows.length === 0) {
            return res.json(null);
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getScheduleList = async (req, res) => {
    const { from, direction, route_id } = req.query;

    if (!from) {
        return res.status(400).json({ error: 'Missing "from" station ID' });
    }

    const currentTime = getCurrentTimeHHMMSS();
    const currentDate = getCurrentDate();
    const currentDay = getCurrentDayName();

    let params = [from, currentTime, currentDate];

    // Inner query to fetch schedules and calculate headsign for relevant trips only
    let innerQuery = `
        SELECT
            t.trip_id,
            st.arrival_time,
            st.departure_time,
            st.stop_sequence,
            s.stop_name as station_name,
            (
                SELECT s_last.stop_name 
                FROM stop_times st_last
                JOIN stops s_last ON st_last.stop_id = s_last.stop_id
                WHERE st_last.trip_id = t.trip_id
                ORDER BY st_last.stop_sequence DESC
                LIMIT 1
            ) as trip_headsign,
            r.route_long_name,
            r.route_short_name,
            r.route_type
        FROM stop_times st
        JOIN trips t ON st.trip_id = t.trip_id
        JOIN routes r ON t.route_id = r.route_id
        JOIN stops s ON st.stop_id = s.stop_id
        JOIN calendar c ON t.service_id = c.service_id
        WHERE st.stop_id = $1
          AND st.departure_time >= $2
          AND c.${currentDay} = true
          AND c.start_date <= $3
          AND c.end_date >= $3
    `;

    if (route_id) {
        innerQuery += ` AND t.route_id = $${params.length + 1}`;
        params.push(route_id);
    }

    // Wrap in CTE to allow filtering by the calculated trip_headsign
    let query = `
        WITH BaseSchedule AS (
            ${innerQuery}
        )
        SELECT * FROM BaseSchedule
        WHERE 1=1
    `;

    if (direction) {
        query += ` AND trip_headsign ILIKE $${params.length + 1}`;
        params.push(`%${direction}%`);
    }

    query += ` ORDER BY departure_time ASC LIMIT 20`;

    try {
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getRoutes,
    getStations,
    getNextTrain,
    getScheduleList
};
