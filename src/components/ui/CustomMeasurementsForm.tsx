import React from 'react';
import { Ruler, Info, Check } from 'lucide-react';
import { CustomMeasurements } from '../../types';

interface CustomMeasurementsFormProps {
  measurements: CustomMeasurements;
  onChange: (field: keyof CustomMeasurements, value: string) => void;
  errors?: Partial<Record<keyof CustomMeasurements, boolean>>;
  validationMessage?: string | null;
}

export const MEASUREMENT_FIELDS: { 
  key: keyof CustomMeasurements; 
  label: string; 
  unit: string; 
  placeholder: string; 
  hint: string 
}[] = [
  { key: 'chest', label: 'Chest', unit: 'in', placeholder: 'e.g. 44', hint: 'Fullest part of chest' },
  { key: 'hip', label: 'Hip', unit: 'in', placeholder: 'e.g. 48', hint: 'Fullest part of hips' },
  { key: 'abayaLength', label: 'Abaya Length', unit: 'in', placeholder: 'e.g. 56', hint: 'Shoulder down to floor/ankle' },
  { key: 'height', label: 'Your Height', unit: 'cm', placeholder: 'e.g. 159', hint: 'Total barefoot height in cm' },
  { key: 'sleeveLength', label: 'Sleeve Length from Neck', unit: 'in', placeholder: 'e.g. 28', hint: 'From base of neck down over wrist' },
];

export const INITIAL_CUSTOM_MEASUREMENTS: CustomMeasurements = {
  chest: '',
  hip: '',
  abayaLength: '',
  height: '',
  sleeveLength: '',
};

export const CustomMeasurementsForm: React.FC<CustomMeasurementsFormProps> = ({
  measurements,
  onChange,
  errors = {},
  validationMessage
}) => {
  return (
    <div className="bg-[#FAF8F5] border border-[#E0DCD3] rounded-xs p-4 sm:p-5 my-4 space-y-4 transition-all">
      <div className="flex items-center justify-between pb-2 border-b border-[#E0DCD3]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#121212]">
          <Ruler className="w-4 h-4 text-[#8C7853]" />
          <span>Bespoke Made-to-Order Custom Fit</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider bg-[#8C7853]/15 text-[#8C7853] px-2 py-0.5 rounded-xs font-semibold">
          Tailored Sizing
        </span>
      </div>

      <p className="text-[11px] text-[#555555] leading-relaxed flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-[#8C7853] shrink-0 mt-0.5" />
        <span>
          Please enter your positive numeric body dimensions below. Our master ateliers tailor each bespoke piece specifically to these custom measurements (bypassing standard stock limits).
        </span>
      </p>

      {validationMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xs font-medium">
          {validationMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MEASUREMENT_FIELDS.map(({ key, label, unit, placeholder, hint }) => {
          const isError = Boolean(errors[key]);
          const val = measurements[key] ?? '';

          return (
            <div key={key} className="space-y-1">
              <label className="block text-[11px] font-medium text-[#222222]">
                <span className="flex items-center justify-between">
                  <span>
                    {label} ({unit}) <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[9px] text-[#888888] font-normal">{hint}</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={val}
                  onChange={(e) => {
                    const raw = e.target.value;
                    // Ensure positive number or empty
                    if (raw === '' || parseFloat(raw) >= 0) {
                      onChange(key, raw);
                    }
                  }}
                  placeholder={placeholder}
                  className={`w-full px-3 py-2 text-xs bg-[#FCFCFA] border rounded-xs focus:outline-none transition-colors pr-8 font-mono ${
                    isError
                      ? 'border-red-500 focus:border-red-600 bg-red-50/20'
                      : 'border-[#D1CDC7] focus:border-[#121212] focus:ring-1 focus:ring-[#121212]'
                  }`}
                  required
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-[#888888] font-semibold uppercase pointer-events-none">
                  {unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-[#777777] bg-[#F5F2EA] p-2.5 rounded-xs flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5 text-[#8C7853]" />
        <span>All 5 custom measurements are saved with your order and tailored to your individual frame.</span>
      </div>
    </div>
  );
};
