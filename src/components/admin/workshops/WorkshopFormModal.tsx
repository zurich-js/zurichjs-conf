/**
 * WorkshopFormModal
 * Create/Edit workshop modal form for admin panel.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { WorkshopDetail, WorkshopLevel, WorkshopTimeSlot, WorkshopStatus } from '@/lib/types/workshop';
import { WORKSHOP_LEVELS, WORKSHOP_TIME_SLOTS, WORKSHOP_STATUSES, WORKSHOP_LEVEL_LABELS, WORKSHOP_TIME_SLOT_LABELS } from '@/lib/types/workshop';

interface WorkshopFormModalProps {
  workshop?: WorkshopDetail | null;
  onClose: () => void;
  onSave: (data: WorkshopFormData) => Promise<void>;
}

export interface WorkshopFormData {
  title: string;
  slug: string;
  short_abstract: string;
  long_abstract: string;
  status: WorkshopStatus;
  featured: boolean;
  date: string;
  time_slot: WorkshopTimeSlot;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  level: WorkshopLevel;
  topic_tags: string[];
  outcomes: string[];
  prerequisites: string[];
  agenda: string[];
  capacity: number;
  price: number;
  currency: string;
  location: string;
  room: string;
  instructor_id: string;
}

const defaultForm: WorkshopFormData = {
  title: '',
  slug: '',
  short_abstract: '',
  long_abstract: '',
  status: 'draft',
  featured: false,
  date: '2026-09-10',
  time_slot: 'morning',
  start_time: '09:00',
  end_time: '12:30',
  duration_minutes: 210,
  level: 'intermediate',
  topic_tags: [],
  outcomes: [],
  prerequisites: [],
  agenda: [],
  capacity: 30,
  price: 0,
  currency: 'CHF',
  location: 'Zurich',
  room: '',
  instructor_id: '',
};

export function WorkshopFormModal({ workshop, onClose, onSave }: WorkshopFormModalProps) {
  const isEditing = !!workshop;
  const [form, setForm] = useState<WorkshopFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // List input helpers
  const [tagInput, setTagInput] = useState('');
  const [outcomeInput, setOutcomeInput] = useState('');
  const [prereqInput, setPrereqInput] = useState('');
  const [agendaInput, setAgendaInput] = useState('');

  useEffect(() => {
    if (workshop) {
      setForm({
        title: workshop.title,
        slug: workshop.slug,
        short_abstract: workshop.short_abstract,
        long_abstract: workshop.long_abstract,
        status: workshop.status,
        featured: workshop.featured,
        date: workshop.date,
        time_slot: workshop.time_slot,
        start_time: workshop.start_time,
        end_time: workshop.end_time,
        duration_minutes: workshop.duration_minutes,
        level: workshop.level,
        topic_tags: workshop.topic_tags || [],
        outcomes: workshop.outcomes || [],
        prerequisites: workshop.prerequisites || [],
        agenda: workshop.agenda || [],
        capacity: workshop.capacity,
        price: workshop.price,
        currency: workshop.currency,
        location: workshop.location,
        room: workshop.room || '',
        instructor_id: workshop.instructor_id || '',
      });
    }
  }, [workshop]);

  const handleSlugGenerate = () => {
    const slug = form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setForm(f => ({ ...f, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workshop');
    } finally {
      setSaving(false);
    }
  };

  const addToList = (field: 'topic_tags' | 'outcomes' | 'prerequisites' | 'agenda', value: string) => {
    if (!value.trim()) return;
    setForm(f => ({ ...f, [field]: [...f[field], value.trim()] }));
  };

  const removeFromList = (field: 'topic_tags' | 'outcomes' | 'prerequisites' | 'agenda', index: number) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== index) }));
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-black">
            {isEditing ? 'Edit Workshop' : 'New Workshop'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Title *</label>
              <input
                type="text"
                className={inputClass}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Slug *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={inputClass}
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  required
                  pattern="^[a-z0-9-]+$"
                />
                <button type="button" onClick={handleSlugGenerate} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                  Auto
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as WorkshopStatus }))}>
                {WORKSHOP_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Abstracts */}
          <div>
            <label className={labelClass}>Short Abstract *</label>
            <textarea className={inputClass} rows={2} value={form.short_abstract} onChange={e => setForm(f => ({ ...f, short_abstract: e.target.value }))} required />
          </div>
          <div>
            <label className={labelClass}>Long Abstract *</label>
            <textarea className={inputClass} rows={5} value={form.long_abstract} onChange={e => setForm(f => ({ ...f, long_abstract: e.target.value }))} required />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" className={inputClass} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Time Slot</label>
              <select className={inputClass} value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value as WorkshopTimeSlot }))}>
                {WORKSHOP_TIME_SLOTS.map(s => <option key={s} value={s}>{WORKSHOP_TIME_SLOT_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Start Time</label>
              <input type="time" className={inputClass} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>End Time</label>
              <input type="time" className={inputClass} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Duration (min)</label>
              <input type="number" className={inputClass} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className={labelClass}>Level</label>
              <select className={inputClass} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as WorkshopLevel }))}>
                {WORKSHOP_LEVELS.map(l => <option key={l} value={l}>{WORKSHOP_LEVEL_LABELS[l]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Capacity</label>
              <input type="number" className={inputClass} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className={labelClass}>Price (cents)</label>
              <input type="number" className={inputClass} value={form.price} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Location</label>
              <input type="text" className={inputClass} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Room</label>
              <input type="text" className={inputClass} value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Instructor ID (CFP Speaker)</label>
              <input type="text" className={inputClass} value={form.instructor_id} onChange={e => setForm(f => ({ ...f, instructor_id: e.target.value }))} placeholder="UUID" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="featured" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
            <label htmlFor="featured" className="text-sm text-gray-700">Featured workshop</label>
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>Topic Tags</label>
            <div className="flex gap-2 mb-2">
              <input type="text" className={inputClass} value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add a tag..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToList('topic_tags', tagInput); setTagInput(''); } }} />
              <button type="button" onClick={() => { addToList('topic_tags', tagInput); setTagInput(''); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Add</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.topic_tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700">
                  {tag}
                  <button type="button" onClick={() => removeFromList('topic_tags', i)} className="text-gray-400 hover:text-red-500">&times;</button>
                </span>
              ))}
            </div>
          </div>

          {/* Outcomes */}
          <div>
            <label className={labelClass}>Outcomes (What You Will Learn)</label>
            <div className="flex gap-2 mb-2">
              <input type="text" className={inputClass} value={outcomeInput} onChange={e => setOutcomeInput(e.target.value)} placeholder="Add an outcome..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToList('outcomes', outcomeInput); setOutcomeInput(''); } }} />
              <button type="button" onClick={() => { addToList('outcomes', outcomeInput); setOutcomeInput(''); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Add</button>
            </div>
            <ul className="space-y-1">
              {form.outcomes.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="flex-grow">{item}</span>
                  <button type="button" onClick={() => removeFromList('outcomes', i)} className="text-gray-400 hover:text-red-500 text-xs">&times;</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Prerequisites */}
          <div>
            <label className={labelClass}>Prerequisites</label>
            <div className="flex gap-2 mb-2">
              <input type="text" className={inputClass} value={prereqInput} onChange={e => setPrereqInput(e.target.value)} placeholder="Add a prerequisite..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToList('prerequisites', prereqInput); setPrereqInput(''); } }} />
              <button type="button" onClick={() => { addToList('prerequisites', prereqInput); setPrereqInput(''); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Add</button>
            </div>
            <ul className="space-y-1">
              {form.prerequisites.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="flex-grow">{item}</span>
                  <button type="button" onClick={() => removeFromList('prerequisites', i)} className="text-gray-400 hover:text-red-500 text-xs">&times;</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Agenda */}
          <div>
            <label className={labelClass}>Agenda</label>
            <div className="flex gap-2 mb-2">
              <input type="text" className={inputClass} value={agendaInput} onChange={e => setAgendaInput(e.target.value)} placeholder="Add agenda item..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToList('agenda', agendaInput); setAgendaInput(''); } }} />
              <button type="button" onClick={() => { addToList('agenda', agendaInput); setAgendaInput(''); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Add</button>
            </div>
            <ol className="space-y-1">
              {form.agenda.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 text-xs w-4">{i + 1}.</span>
                  <span className="flex-grow">{item}</span>
                  <button type="button" onClick={() => removeFromList('agenda', i)} className="text-gray-400 hover:text-red-500 text-xs">&times;</button>
                </li>
              ))}
            </ol>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-black bg-[#F1E271] hover:bg-[#e8d95e] disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Workshop' : 'Create Workshop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
