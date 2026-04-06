
import React, { useState, useEffect } from 'react';
import { BreakdownEvent, BreakdownReason } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: BreakdownEvent) => void;
  inverterName: string;
  initialEvent?: BreakdownEvent | null;
}

const BreakdownEntryModal: React.FC<Props> = ({ isOpen, onClose, onSave, inverterName, initialEvent }) => {
  const [formData, setFormData] = useState<Partial<BreakdownEvent>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialEvent) {
        setFormData(initialEvent);
      } else {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        setFormData({
          start_date: now.toISOString().slice(0, 16), // Simplified for datetime-local
          end_date: oneHourLater.toISOString().slice(0, 16),
          description: '',
          loss_kwh: 0,
        });
      }
    }
  }, [isOpen, initialEvent]);

  const handleSave = () => {
    if (!formData.start_date || !formData.end_date || !formData.description) {
      alert("Please fill all required fields.");
      return;
    }

    onSave({
      ...formData,
      start_date: new Date(formData.start_date!).toISOString(),
      end_date: new Date(formData.end_date!).toISOString(),
    } as BreakdownEvent);
  };

  if (!isOpen) return null;

  const handleChange = (field: keyof BreakdownEvent, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  const toDatetimeLocal = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso; // Already in local format potentially
      // Format as YYYY-MM-DDTHH:mm
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-solar-bg w-full max-w-lg m-4 rounded-lg border border-solar-border shadow-2xl flex flex-col">
        <div className="p-6 border-b border-solar-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-solar-accent">{initialEvent ? 'Edit' : 'Log'} Breakdown Event</h2>
          <button onClick={onClose} className="text-2xl text-solar-text hover:text-white">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-400">For Inverter: <span className="font-bold text-white">{inverterName}</span></p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date & Time</label>
              <input
                type="datetime-local"
                className="input-field"
                value={toDatetimeLocal(formData.start_date)}
                onChange={e => handleChange('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="label">End Date & Time</label>
              <input
                type="datetime-local"
                className="input-field"
                value={toDatetimeLocal(formData.end_date)}
                onChange={e => handleChange('end_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Energy Loss (kWh)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={formData.loss_kwh}
              onChange={e => handleChange('loss_kwh', parseFloat(e.target.value))}
            />
          </div>

          <div>
            <label className="label">Description / Reason</label>
            <textarea
              className="input-field"
              placeholder="Provide a detailed description of the breakdown..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
            ></textarea>
          </div>
        </div>

        <div className="p-6 border-t border-solar-border flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 rounded text-gray-300 hover:bg-solar-card">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-solar-success text-white font-bold hover:bg-green-600">Save Event</button>
        </div>
      </div>

      <style>{`
        .label { display: block; font-size: 0.875rem; color: #a0aec0; margin-bottom: 0.25rem; }
        .input-field { width: 100%; background-color: #1B263B; border: 1px solid #415A77; border-radius: 4px; padding: 8px; color: white; outline: none; }
        .input-field:focus { border-color: #FFD700; }
      `}</style>
    </div>
  );
};

export default BreakdownEntryModal;
