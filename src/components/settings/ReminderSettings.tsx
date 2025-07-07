import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReminderSettingsProps {
  settings: {
    enabled: boolean;
    time: string;
    timezone: string;
  };
  onChange: (settings: { enabled: boolean; time: string; timezone: string }) => void;
}

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Mountain Time - Arizona (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

export function ReminderSettings({ settings, onChange }: ReminderSettingsProps) {
  // Parse time string to get hours, minutes, and period
  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return { hours: displayHours, minutes, period };
  };

  // Format time back to 24-hour string
  const formatTime = (hours: number, minutes: number, period: string) => {
    let hour24 = hours;
    if (period === 'AM' && hours === 12) hour24 = 0;
    if (period === 'PM' && hours !== 12) hour24 = hours + 12;
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const { hours, minutes, period } = parseTime(settings.time);

  const updateTime = (newHours: number, newMinutes: number, newPeriod: string) => {
    const newTime = formatTime(newHours, newMinutes, newPeriod);
    onChange({ ...settings, time: newTime });
  };

  // Generate hour options (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate minute options (0, 15, 30, 45)
  const minuteOptions = [0, 15, 30, 45];

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="reminder-enabled" className="text-sm font-medium">
            Daily Reminders
          </Label>
          <p className="text-sm text-muted-foreground">
            Receive a daily SMS reminder to journal if you haven't written an entry
          </p>
        </div>
        <Switch
          id="reminder-enabled"
          checked={settings.enabled}
          onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
        />
      </div>

      {/* Time and Timezone Settings - Only show when enabled */}
      {settings.enabled && (
        <div className="space-y-4 pl-6 border-l-2 border-border">
          {/* Time Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reminder Time</Label>
            <div className="flex items-center gap-2">
              {/* Hours */}
              <Select
                value={hours.toString()}
                onValueChange={(value) => updateTime(parseInt(value), minutes, period)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions.map((hour) => (
                    <SelectItem key={hour} value={hour.toString()}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground">:</span>

              {/* Minutes */}
              <Select
                value={minutes.toString()}
                onValueChange={(value) => updateTime(hours, parseInt(value), period)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minuteOptions.map((minute) => (
                    <SelectItem key={minute} value={minute.toString()}>
                      {minute.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* AM/PM */}
              <Select
                value={period}
                onValueChange={(value) => updateTime(hours, minutes, value)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timezone Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Time Zone</Label>
            <Select
              value={settings.timezone}
              onValueChange={(timezone) => onChange({ ...settings, timezone })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {US_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}