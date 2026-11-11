import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { destinationsApi } from '../../api/destinations.js';
import { adminApi } from '../../api/admin.js';
import { getErrorMessage } from '../../api/client.js';
import { invalidateDestinations } from '../../utils/invalidate.js';
import Spinner from '../../components/Spinner.jsx';

const EMPTY = {
  name: '', description: '', countryId: '', city: '',
  latitude: '', longitude: '', bestTimeToVisit: '', categoryIds: [],
};
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function DestinationFormPage() {
  const { slug } = useParams();
  const isEdit = Boolean(slug);

  const existing = useQuery({
    queryKey: ['destination', slug],
    queryFn: () => destinationsApi.getBySlug(slug),
    enabled: isEdit,
  });
  const meta = useQuery({ queryKey: ['filters'], queryFn: destinationsApi.filters });

  if ((isEdit && existing.isLoading) || meta.isLoading) return <Spinner />;
  if (existing.isError) return <p className="text-red-600">{getErrorMessage(existing.error)}</p>;

  const d = existing.data;
  const initial = d
    ? {
        name: d.name,
        description: d.description,
        countryId: String(d.country.id),
        city: d.city,
        latitude: d.latitude ?? '',
        longitude: d.longitude ?? '',
        bestTimeToVisit: d.bestTimeToVisit ?? '',
        categoryIds: d.categories.map((c) => c.id),
      }
    : EMPTY;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/destinations" className="text-sm text-teal-700 hover:underline">← All destinations</Link>
        <h1 className="mt-1 text-3xl font-bold">{isEdit ? `Edit: ${d.name}` : 'New destination'}</h1>
      </div>
      {/* key: reset the form state when switching between destinations */}
      <DestinationForm key={d?.id ?? 'new'} initial={initial} destination={d} meta={meta.data} />
      {d && <ImageManager destination={d} />}
    </div>
  );
}

function DestinationForm({ initial, destination, meta }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const toggleCategory = (id) =>
    setForm({
      ...form,
      categoryIds: form.categoryIds.includes(id)
        ? form.categoryIds.filter((c) => c !== id)
        : [...form.categoryIds, id],
    });

  const save = useMutation({
    mutationFn: (payload) =>
      destination
        ? adminApi.updateDestination(destination.id, payload)
        : adminApi.createDestination(payload),
    onSuccess: (saved) => {
      invalidateDestinations(queryClient, saved.slug);
      if (destination) {
        toast.success('Changes saved');
      } else {
        toast.success('Destination created. Now add some photos!');
        navigate(`/admin/destinations/${saved.slug}/edit`, { replace: true });
      }
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    setError('');
    save.mutate({
      name: form.name,
      description: form.description,
      countryId: Number(form.countryId),
      city: form.city,
      categoryIds: form.categoryIds,
      ...(form.bestTimeToVisit && { bestTimeToVisit: form.bestTimeToVisit }),
      ...(form.latitude !== '' && { latitude: Number(form.latitude) }),
      ...(form.longitude !== '' && { longitude: Number(form.longitude) }),
    });
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Name *</span>
          <input value={form.name} onChange={set('name')} required minLength={2} className="input" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">City *</span>
          <input value={form.city} onChange={set('city')} required minLength={2} className="input" />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Description * (min 20 characters)</span>
        <textarea value={form.description} onChange={set('description')} required minLength={20} rows={4} className="input" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Country *</span>
          <select value={form.countryId} onChange={set('countryId')} required className="input">
            <option value="">Select a country</option>
            {meta.countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Best time to visit</span>
          <input value={form.bestTimeToVisit} onChange={set('bestTimeToVisit')} placeholder="October to March" className="input" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Latitude</span>
          <input type="number" step="any" min={-90} max={90} value={form.latitude} onChange={set('latitude')} className="input" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Longitude</span>
          <input type="number" step="any" min={-180} max={180} value={form.longitude} onChange={set('longitude')} className="input" />
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Categories * (1 to 5)</span>
        <div className="flex flex-wrap gap-2">
          {meta.categories.map((c) => {
            const active = form.categoryIds.includes(c.id);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleCategory(c.id)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  active ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <button type="submit" disabled={save.isPending || form.categoryIds.length === 0} className="btn-primary">
        {save.isPending ? 'Saving...' : destination ? 'Save changes' : 'Create destination'}
      </button>
    </form>
  );
}

function ImageManager({ destination }) {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);

  const refresh = () => invalidateDestinations(queryClient, destination.slug);

  const onPick = (e) => {
    const picked = [...e.target.files];
    const tooBig = picked.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length) toast.error(`${tooBig.map((f) => f.name).join(', ')}: larger than 5 MB`);
    setFiles(picked.filter((f) => f.size <= MAX_FILE_BYTES).slice(0, 5));
  };

  const upload = useMutation({
    mutationFn: () => adminApi.uploadImages(destination.id, files),
    onSuccess: () => {
      toast.success('Images uploaded');
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (imageId) => adminApi.deleteImage(destination.id, imageId),
    onSuccess: () => {
      toast.success('Image deleted');
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <section className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold">Photos</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {destination.images.map((img) => (
          <div key={img.id} className="group relative overflow-hidden rounded-xl">
            <img src={img.url} alt="" className="aspect-[4/3] w-full object-cover" />
            {Boolean(img.isPrimary) && (
              <span className="absolute left-2 top-2 rounded bg-teal-600 px-2 py-0.5 text-xs text-white">Cover</span>
            )}
            <button
              onClick={() => window.confirm('Delete this photo?') && remove.mutate(img.id)}
              className="absolute right-2 top-2 rounded-full bg-white/90 px-2 text-sm text-red-600 opacity-0 transition group-hover:opacity-100"
              aria-label="Delete photo"
            >
              ✕
            </button>
          </div>
        ))}
        {destination.images.length === 0 && <p className="text-sm text-slate-400">No photos yet.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={onPick}
          className="text-sm"
        />
        <button onClick={() => upload.mutate()} disabled={files.length === 0 || upload.isPending} className="btn-primary">
          {upload.isPending ? 'Uploading...' : `Upload ${files.length || ''} photo${files.length === 1 ? '' : 's'}`}
        </button>
        <p className="w-full text-xs text-slate-400">JPG, PNG or WebP · max 5 files · 5 MB each</p>
      </div>
    </section>
  );
}
