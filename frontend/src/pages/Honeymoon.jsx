import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useGuideContent } from '../context/GuideContentContext.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import DestinationCalculator from './honeymoon/DestinationCalculator.jsx';
import FlightsSection from './honeymoon/FlightsSection.jsx';
import StaysSection from './honeymoon/StaysSection.jsx';
import ChecklistSection from './honeymoon/ChecklistSection.jsx';

export default function Honeymoon() {
  const [data, setData] = useState(null);
  const destinationGuide = useGuideContent('honeymoon.destinations');
  const [flights, setFlights] = useState(null);
  const [stays, setStays] = useState(null);
  const [error, setError] = useState('');
  const [destination, setDestination] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([api.get('/honeymoon'), api.get('/honeymoon/flights'), api.get('/honeymoon/stays')])
      .then(([hm, fl, st]) => {
        setData(hm.honeymoon || {});
        setDestination(hm.honeymoon?.destination || '');
        setBudget(hm.honeymoon?.budget ?? '');
        setNotes(hm.honeymoon?.notes || '');
        setFlights(fl.flights);
        setStays(st.stays);
      })
      .catch((err) => setError(err.message));
  }, []);

  const patch = async (fields) => {
    setError('');
    try {
      const result = await api.patch('/honeymoon', fields);
      setData(result.honeymoon);
    } catch (err) {
      setError(err.message);
    }
  };

  const addFlight = async (fields) => {
    const result = await api.post('/honeymoon/flights', fields);
    setFlights((prev) => [...prev, result.flight]);
  };
  const updateFlight = async (flight, fields) => {
    const result = await api.patch(`/honeymoon/flights/${flight.id}`, fields);
    setFlights((prev) => prev.map((f) => (f.id === flight.id ? result.flight : f)));
  };
  const deleteFlight = async (flight) => {
    await api.delete(`/honeymoon/flights/${flight.id}`);
    setFlights((prev) => prev.filter((f) => f.id !== flight.id));
  };

  const addStay = async (fields) => {
    const result = await api.post('/honeymoon/stays', fields);
    setStays((prev) => [...prev, result.stay]);
  };
  const updateStay = async (stay, fields) => {
    const result = await api.patch(`/honeymoon/stays/${stay.id}`, fields);
    setStays((prev) => prev.map((s) => (s.id === stay.id ? result.stay : s)));
  };
  const deleteStay = async (stay) => {
    await api.delete(`/honeymoon/stays/${stay.id}`);
    setStays((prev) => prev.filter((s) => s.id !== stay.id));
  };

  const applyCalculatorResult = async ({ legs, stays: newStays }) => {
    setError('');
    try {
      const [flightRes, stayRes] = await Promise.all([
        api.post('/honeymoon/flights/bulk', { legs }),
        api.post('/honeymoon/stays/bulk', { stays: newStays }),
      ]);
      setFlights((prev) => [...prev, ...flightRes.flights]);
      setStays((prev) => [...prev, ...stayRes.stays]);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!data || !flights || !stays || !destinationGuide) return <div className="full-page-center">불러오는 중...</div>;

  return (
    <div>
      <h1>신혼여행</h1>
      {error && <div className="error-banner">{error}</div>}

      <DestinationCalculator destinationGuide={destinationGuide} onApply={applyCalculatorResult} />

      <div className="card">
        <h2>우리 신혼여행</h2>
        <div className="form-row">
          <div className="field">
            <label>목적지</label>
            <input
              list="destinations-mine"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onBlur={() => patch({ destination })}
            />
            <datalist id="destinations-mine">
              {destinationGuide.map((d) => <option key={d.name} value={d.name} />)}
            </datalist>
          </div>
          <div className="field">
            <label>예산</label>
            <MoneyInput
              value={budget}
              onChange={setBudget}
              onBlurCommit={() => Number(budget || 0) !== Number(data.budget || 0) && patch({ budget: budget === '' ? null : Number(budget) })}
            />
          </div>
        </div>
        <div className="field">
          <label>기타 메모</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => patch({ notes })} />
        </div>
      </div>

      <FlightsSection flights={flights} onAdd={addFlight} onUpdate={updateFlight} onDelete={deleteFlight} />
      <StaysSection stays={stays} onAdd={addStay} onUpdate={updateStay} onDelete={deleteStay} />

      <ChecklistSection />
    </div>
  );
}
