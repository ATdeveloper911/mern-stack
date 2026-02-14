import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Edit3, Plus, Search, Sparkles, Star, Trash2, X, Loader } from 'lucide-react';
import api from '../../utils/api';

const AdminContent = () => {
  const location = useLocation();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [autoFillQuery, setAutoFillQuery] = useState('');
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState('');
  const [autoFillMeta, setAutoFillMeta] = useState(null);

  const [form, setForm] = useState({
    name: '',
    city: '',
    country: 'Pakistan',
    category: 'Northern Areas',
    description: '',
    tagline: '',
    isPopular: false,
    bestSeason: 'all',
    region: '',
    culture: '',
    history: '',
    images: '',
    coordinatesLat: '',
    coordinatesLng: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/destinations').catch(() => ({ data: [] }));
      setDestinations(res.data || []);
    } catch (e) {
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const runAutoFill = async () => {
    const q = autoFillQuery.trim();
    if (!q) return;
    setAutoFilling(true);
    setAutoFillError('');
    setAutoFillMeta(null);
    try {
      const res = await api.post('/admin/destination-autofill', { query: q });
      const dest = res.data?.destination;
      if (!dest) {
        throw new Error('No destination data returned.');
      }

      const imagesText = Array.isArray(dest.images) ? dest.images.join(', ') : '';
      setForm((prev) => ({
        ...prev,
        name: dest.name ?? prev.name,
        city: dest.city ?? prev.city,
        country: dest.country ?? prev.country,
        category: dest.category ?? prev.category,
        description: dest.description ?? prev.description,
        tagline: dest.tagline ?? prev.tagline,
        bestSeason: dest.bestSeason ?? prev.bestSeason,
        region: dest.region ?? prev.region,
        culture: dest.culture ?? prev.culture,
        history: dest.history ?? prev.history,
        images: imagesText || prev.images,
        coordinatesLat: dest.coordinates?.lat ?? prev.coordinatesLat,
        coordinatesLng: dest.coordinates?.lng ?? prev.coordinatesLng,
      }));

      setAutoFillMeta({
        source: res.data?.source || 'google',
        placeId: res.data?.placeId || '',
        rating: dest.rating,
      });
    } catch (e) {
      setAutoFillError(e?.response?.data?.message || e?.message || 'Auto-fill failed.');
    } finally {
      setAutoFilling(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') || '');
  }, [location.search]);

  const openAdd = () => {
    setEditing(null);
    setError('');
    setAutoFillQuery('');
    setAutoFillError('');
    setAutoFillMeta(null);
    setForm({
      name: '',
      city: '',
      country: 'Pakistan',
      category: 'Northern Areas',
      description: '',
      tagline: '',
      isPopular: false,
      bestSeason: 'all',
      region: '',
      culture: '',
      history: '',
      images: '',
      coordinatesLat: '',
      coordinatesLng: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setError('');
    setAutoFillQuery('');
    setAutoFillError('');
    setAutoFillMeta(null);
    setForm({
      name: d.name || '',
      city: d.city || '',
      country: d.country || 'Pakistan',
      category: d.category || 'Northern Areas',
      description: d.description || '',
      tagline: d.tagline || '',
      isPopular: !!d.isPopular,
      bestSeason: d.bestSeason || 'all',
      region: d.region || '',
      culture: d.culture || '',
      history: d.history || '',
      images: (d.images || []).join(', '),
      coordinatesLat: d.coordinates?.lat ?? '',
      coordinatesLng: d.coordinates?.lng ?? '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditing(null);
    setError('');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter((d) => {
      const name = (d.name || '').toLowerCase();
      const city = (d.city || '').toLowerCase();
      return name.includes(q) || city.includes(q);
    });
  }, [destinations, query]);

  const deleteDestination = async (id) => {
    if (!window.confirm('Delete this destination?')) return;
    try {
      await api.delete(`/admin/destinations/${id}`);
      await load();
    } catch (e) {
      // ignore
    }
  };

  const saveDestination = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!form.name.trim() || !form.city.trim() || !form.country.trim() || !form.category || !form.description.trim()) {
        throw new Error('Name, city, country, category and description are required.');
      }

      const images = form.images
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        category: form.category,
        description: form.description.trim(),
        tagline: form.tagline,
        isPopular: !!form.isPopular,
        bestSeason: form.bestSeason || undefined,
        region: form.region || undefined,
        culture: form.culture || undefined,
        history: form.history || undefined,
        images: images.length ? images : undefined,
        coordinates: {
          lat: form.coordinatesLat !== '' ? Number(form.coordinatesLat) : undefined,
          lng: form.coordinatesLng !== '' ? Number(form.coordinatesLng) : undefined,
        },
      };

      if (editing?._id) {
        await api.put(`/admin/destinations/${editing._id}`, payload);
      } else {
        await api.post('/admin/destinations', payload);
      }

      await load();
      setIsModalOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save destination.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h2>Content</h2>
          <p className="ad-page-subtitle">Manage destinations and featured content entries.</p>
        </div>
      </div>

      <div className="ad-card ad-card-pad">
        <div className="ad-toolbar">
          <div style={{ position: 'relative', width: 'min(420px, 100%)' }}>
            <input
              className="ad-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search content..."
            />
            <Search
              size={18}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ad-muted)',
              }}
            />
          </div>

          <button type="button" className="ad-btn ad-btn-primary" onClick={openAdd}>
            <Plus size={18} />
            Add Content
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="ad-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Location</th>
                <th>Category</th>
                <th>Popular</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 18, fontWeight: 700, color: 'var(--ad-muted)' }}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 18, fontWeight: 700, color: 'var(--ad-muted)' }}>
                    No content found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d._id}>
                    <td style={{ fontWeight: 950 }}>{d.name}</td>
                    <td>{[d.city, d.country].filter(Boolean).join(', ') || '—'}</td>
                    <td>
                      <span className="ad-badge">{d.category || '—'}</span>
                    </td>
                    <td>
                      {d.isPopular ? (
                        <span className="ad-badge gold">
                          <Star size={14} style={{ marginRight: 6 }} /> Featured
                        </span>
                      ) : (
                        <span className="ad-badge">—</span>
                      )}
                    </td>
                    <td>
                      <div className="ad-actions">
                        <button type="button" className="ad-icon-btn" onClick={() => openEdit(d)} title="Edit">
                          <Edit3 size={18} />
                        </button>
                        <button type="button" className="ad-icon-btn" onClick={() => deleteDestination(d._id)} title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div className="ad-modal-overlay" onClick={closeModal}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header">
              <h3 className="ad-modal-title">{editing ? 'Edit Destination' : 'Add Destination'}</h3>
              <button type="button" className="ad-icon-btn" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveDestination}>
              <div className="ad-modal-scroll">
                <div className="ad-magic-box" style={{ marginBottom: 16 }}>
                  <div className="ad-magic-header">
                    <Sparkles size={16} className="ad-magic-icon" />
                    <span>Auto-Fill from Google + AI</span>
                  </div>
                  <div className="ad-magic-input-group">
                    <input
                      type="text"
                      value={autoFillQuery}
                      placeholder="Search destination e.g. Hunza Valley, Skardu, Swat..."
                      onChange={(e) => setAutoFillQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          runAutoFill();
                        }
                      }}
                    />
                    <button type="button" onClick={runAutoFill} disabled={autoFilling}>
                      {autoFilling ? <Loader size={16} className="ad-spin" /> : 'Fetch'}
                    </button>
                  </div>
                  {autoFillMeta ? (
                    <p className="ad-magic-hint">
                      Source: <strong>{autoFillMeta.source}</strong>
                      {autoFillMeta.rating ? ` • Rating: ${autoFillMeta.rating}` : ''}
                    </p>
                  ) : null}
                  {autoFillError ? (
                    <div className="ad-badge red" style={{ marginTop: 12 }}>{autoFillError}</div>
                  ) : null}
                </div>

                <div className="ad-form-grid">
                  <div className="ad-field">
                    <label>Name</label>
                    <input className="ad-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="ad-field">
                    <label>City</label>
                    <input className="ad-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>

                  <div className="ad-field">
                    <label>Country</label>
                    <input className="ad-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  </div>
                  <div className="ad-field">
                    <label>Category</label>
                    <select className="ad-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option value="Northern Areas">Northern Areas</option>
                      <option value="Hill Stations">Hill Stations</option>
                      <option value="Valleys">Valleys</option>
                      <option value="Lakes">Lakes</option>
                      <option value="Mountains">Mountains</option>
                      <option value="Beaches">Beaches</option>
                      <option value="Historical">Historical</option>
                      <option value="Cities">Cities</option>
                    </select>
                  </div>

                  <div className="ad-field">
                    <label>Best Season</label>
                    <select className="ad-select" value={form.bestSeason} onChange={(e) => setForm({ ...form, bestSeason: e.target.value })}>
                      <option value="all">all</option>
                      <option value="spring">spring</option>
                      <option value="summer">summer</option>
                      <option value="autumn">autumn</option>
                      <option value="winter">winter</option>
                    </select>
                  </div>
                  <div className="ad-field">
                    <label>Featured</label>
                    <select className="ad-select" value={form.isPopular ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, isPopular: e.target.value === 'yes' })}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div className="ad-form-grid">
                  <div className="ad-field">
                    <label>Latitude</label>
                    <input className="ad-input" value={form.coordinatesLat} onChange={(e) => setForm({ ...form, coordinatesLat: e.target.value })} />
                  </div>
                  <div className="ad-field">
                    <label>Longitude</label>
                    <input className="ad-input" value={form.coordinatesLng} onChange={(e) => setForm({ ...form, coordinatesLng: e.target.value })} />
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div className="ad-form-grid-1">
                  <div className="ad-field">
                    <label>Tagline</label>
                    <input className="ad-input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
                  </div>
                  <div className="ad-field">
                    <label>Description</label>
                    <textarea className="ad-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="ad-field">
                    <label>Images (comma separated URLs)</label>
                    <input className="ad-input" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
                  </div>
                </div>

                {error ? <div className="ad-badge red" style={{ marginTop: 12 }}>{error}</div> : null}
              </div>

              <div className="ad-modal-footer">
                <button type="button" className="ad-btn" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminContent;
