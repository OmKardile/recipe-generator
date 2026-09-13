'use client';

import { Minus, Plus, Users } from 'lucide-react';

export default function ServingAdjuster({ servings, onServingsChange }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
      <Users size={16} className="text-gray-500" />
      <span className="text-sm text-gray-600">Servings:</span>
      <button
        onClick={() => onServingsChange(Math.max(1, servings - 1))}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
      >
        <Minus size={14} className="text-gray-600" />
      </button>
      <span className="font-semibold text-gray-800 w-8 text-center">{servings}</span>
      <button
        onClick={() => onServingsChange(servings + 1)}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
      >
        <Plus size={14} className="text-gray-600" />
      </button>
    </div>
  );
}
