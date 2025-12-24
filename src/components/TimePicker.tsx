import { useState, useEffect, useRef } from 'react';

interface TimePickerProps {
  value: string; // ISO date string
  onChange: (isoString: string) => void;
}

export default function TimePicker({ value, onChange }: TimePickerProps) {
  const date = value ? new Date(value) : new Date();
  const [hour, setHour] = useState(() => {
    const h = date.getHours();
    return h % 12 || 12; // Convert to 12-hour format (1-12)
  });
  const [minute, setMinute] = useState(date.getMinutes());
  const [isPM, setIsPM] = useState(date.getHours() >= 12);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const ampmRef = useRef<HTMLDivElement>(null);

  // Update parent when time changes
  useEffect(() => {
    const newDate = new Date(value || new Date());
    const newHour24 = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    newDate.setHours(newHour24);
    newDate.setMinutes(minute);
    onChange(newDate.toISOString());
  }, [hour, minute, isPM]);

  // Scroll to selected value on mount
  useEffect(() => {
    if (hourRef.current) {
      const selected = hourRef.current.querySelector(`[data-hour="${hour}"]`);
      selected?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    if (minuteRef.current) {
      const selected = minuteRef.current.querySelector(`[data-minute="${minute}"]`);
      selected?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    if (ampmRef.current) {
      const selected = ampmRef.current.querySelector(`[data-ampm="${isPM ? 'PM' : 'AM'}"]`);
      selected?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, []);

  const handleScroll = (type: 'hour' | 'minute' | 'ampm', ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;

    const items = ref.current.querySelectorAll('[data-item]');
    const container = ref.current;
    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const itemHeight = 44; // Height of each item

    // Find the item closest to center
    let closestItem: Element | null = null;
    let closestDistance = Infinity;

    items.forEach((item) => {
      const itemTop = (item as HTMLElement).offsetTop - containerTop;
      const itemCenter = itemTop + itemHeight / 2;
      const containerCenter = containerHeight / 2;
      const distance = Math.abs(itemCenter - containerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestItem = item;
      }
    });

    if (closestItem) {
      const element = closestItem as HTMLElement;
      const value = element.getAttribute(
        type === 'hour' ? 'data-hour' : type === 'minute' ? 'data-minute' : 'data-ampm'
      );
      if (value) {
        if (type === 'hour') {
          setHour(parseInt(value));
        } else if (type === 'minute') {
          setMinute(parseInt(value));
        } else {
          setIsPM(value === 'PM');
        }
      }
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="flex items-center gap-2 border-2 border-gray-200 rounded-lg p-4 bg-white">
      {/* Hour Column */}
      <div className="flex-1 relative">
        <div
          ref={hourRef}
          className="h-32 overflow-y-auto scrollbar-hide snap-y snap-mandatory"
          onScroll={() => handleScroll('hour', hourRef)}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="py-16">
            {hours.map((h) => (
              <div
                key={h}
                data-item
                data-hour={h}
                className={`h-11 flex items-center justify-center text-2xl font-semibold snap-center cursor-pointer transition-colors ${
                  hour === h ? 'text-cf-red scale-110' : 'text-gray-600'
                }`}
                onClick={() => {
                  setHour(h);
                  const selected = hourRef.current?.querySelector(`[data-hour="${h}"]`);
                  selected?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }}
              >
                {h}
              </div>
            ))}
          </div>
        </div>
        {/* Selection indicator overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-full h-11 border-t-2 border-b-2 border-cf-red/30 bg-cf-red/5 rounded"></div>
        </div>
      </div>

      <span className="text-2xl font-bold text-gray-400">:</span>

      {/* Minute Column */}
      <div className="flex-1 relative">
        <div
          ref={minuteRef}
          className="h-32 overflow-y-auto scrollbar-hide snap-y snap-mandatory"
          onScroll={() => handleScroll('minute', minuteRef)}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="py-16">
            {minutes.map((m) => (
              <div
                key={m}
                data-item
                data-minute={m}
                className={`h-11 flex items-center justify-center text-2xl font-semibold snap-center cursor-pointer transition-colors ${
                  minute === m ? 'text-cf-red scale-110' : 'text-gray-600'
                }`}
                onClick={() => {
                  setMinute(m);
                  const selected = minuteRef.current?.querySelector(`[data-minute="${m}"]`);
                  selected?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }}
              >
                {String(m).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
        {/* Selection indicator overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-full h-11 border-t-2 border-b-2 border-cf-red/30 bg-cf-red/5 rounded"></div>
        </div>
      </div>

      {/* AM/PM Column */}
      <div className="flex-1 relative">
        <div
          ref={ampmRef}
          className="h-32 overflow-y-auto scrollbar-hide snap-y snap-mandatory"
          onScroll={() => handleScroll('ampm', ampmRef)}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="py-16">
            {['AM', 'PM'].map((period) => (
              <div
                key={period}
                data-item
                data-ampm={period}
                className={`h-11 flex items-center justify-center text-2xl font-semibold snap-center cursor-pointer transition-colors ${
                  (isPM && period === 'PM') || (!isPM && period === 'AM')
                    ? 'text-cf-red scale-110'
                    : 'text-gray-600'
                }`}
                onClick={() => {
                  setIsPM(period === 'PM');
                  const selected = ampmRef.current?.querySelector(`[data-ampm="${period}"]`);
                  selected?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }}
              >
                {period}
              </div>
            ))}
          </div>
        </div>
        {/* Selection indicator overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-full h-11 border-t-2 border-b-2 border-cf-red/30 bg-cf-red/5 rounded"></div>
        </div>
      </div>
    </div>
  );
}

