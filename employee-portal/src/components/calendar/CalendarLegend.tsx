interface CalendarLegendProps {
  viewMode: 'og' | 'modern' | 'bifrost';
}

const LEGEND_ITEMS = {
  bifrost: [
    { label: 'Vacation', color: '#6C3FA0' },
    { label: 'Sick', color: '#2ABFBF' },
    { label: 'Personal', color: '#E8B84B' },
  ],
  default: [
    { label: 'Vacation', color: '#2563EB' },
    { label: 'Sick', color: '#F87171' },
    { label: 'Personal', color: '#F59E0B' },
  ],
};

export default function CalendarLegend({ viewMode }: CalendarLegendProps) {
  const items = viewMode === 'bifrost' ? LEGEND_ITEMS.bifrost : LEGEND_ITEMS.default;

  return (
    <div className="flex items-center gap-4 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function getBarColor(ptoType: string, viewMode: 'og' | 'modern' | 'bifrost'): string {
  if (viewMode === 'bifrost') {
    switch (ptoType) {
      case 'vacation': return '#6C3FA0';
      case 'sick': return '#2ABFBF';
      case 'personal': return '#E8B84B';
      default: return '#6C3FA0';
    }
  }
  switch (ptoType) {
    case 'vacation': return '#2563EB';
    case 'sick': return '#F87171';
    case 'personal': return '#F59E0B';
    default: return '#2563EB';
  }
}
