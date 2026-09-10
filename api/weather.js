// Vercel serverless function — proxies Buienradar's free public weather feed.
// Buienradar has no CORS headers for browser use, so we fetch it server-side
// and hand back a small, simplified payload. No API key needed for this feed;
// per Buienradar's terms we link back to buienradar.nl in the UI.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Default to De Bilt (KNMI's own reference station, geographic center of NL)
  // whenever the browser didn't share a location.
  const lat = parseFloat(req.query.lat) || 52.0907;
  const lon = parseFloat(req.query.lon) || 5.1214;

  try {
    const feedRes = await fetch('https://data.buienradar.nl/2.0/feed/json');
    if (!feedRes.ok) throw new Error('Buienradar feed error ' + feedRes.status);
    const feed = await feedRes.json();
    const stations = feed?.actual?.stationmeasurements || [];
    if (stations.length === 0) throw new Error('No station data available');

    // nearest station by simple squared-distance (fine at this scale, no need for haversine)
    let nearest = stations[0];
    let best = Infinity;
    for (const s of stations) {
      const dx = lat - s.lat, dy = lon - s.lon;
      const dd = dx * dx + dy * dy;
      if (dd < best) { best = dd; nearest = s; }
    }

    // short-term rain forecast: "value|HH:MM" lines every 5 min for the next 2h.
    // value is on Buienradar's 0-255 log scale; 0 means no rain.
    let rainAt = null;
    try {
      const rainRes = await fetch(`https://gpsgadget.buienradar.nl/data/raintext?lat=${lat}&lon=${lon}`);
      if (rainRes.ok) {
        const text = await rainRes.text();
        const line = text.trim().split('\n')
          .map(l => { const [v, time] = l.split('|'); return { v: parseInt(v, 10), time }; })
          .find(l => l.v > 0);
        if (line) rainAt = line.time;
      }
    } catch (e) { /* rain forecast is a bonus, safe to skip on failure */ }

    res.status(200).json({
      station: nearest.stationname,
      temperature: nearest.temperature,
      feelTemperature: nearest.feeltemperature,
      description: nearest.weatherdescription,
      windSpeedKmh: Math.round((nearest.windspeed || 0) * 3.6),
      iconUrl: nearest.iconurl,
      rainAt,
    });
  } catch (err) {
    console.error('Weather function error:', err);
    res.status(502).json({ error: 'Weather service unavailable' });
  }
};
