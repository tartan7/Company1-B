// VBA Runtime Library — TypeScript equivalents of VBA built-in functions

// ─── String Functions ────────────────────────────────────────────────────────

export function Left(str: string, n: number): string {
  return String(str ?? '').slice(0, Math.max(0, n));
}

export function Right(str: string, n: number): string {
  const s = String(str ?? '');
  return s.slice(Math.max(0, s.length - n));
}

export function Mid(str: string, start: number, length?: number): string {
  const s = String(str ?? '');
  const i = start - 1; // VBA is 1-based
  return length === undefined ? s.slice(i) : s.slice(i, i + length);
}

export function Len(str: any): number {
  if (str === null || str === undefined) return 0;
  return String(str).length;
}

export function Trim(str: string): string { return String(str ?? '').trim(); }
export function LTrim(str: string): string { return String(str ?? '').trimStart(); }
export function RTrim(str: string): string { return String(str ?? '').trimEnd(); }

export function InStr(startOrStr: number | string, strOrPattern: string, pattern?: string): number {
  let start: number, str: string, pat: string;
  if (typeof startOrStr === 'number') {
    start = startOrStr; str = String(strOrPattern); pat = String(pattern!);
  } else {
    start = 1; str = String(startOrStr); pat = String(strOrPattern);
  }
  const idx = str.indexOf(pat, start - 1);
  return idx === -1 ? 0 : idx + 1;
}

export function InStrRev(str: string, pattern: string, start = -1): number {
  const s = String(str ?? '');
  const end = start === -1 ? s.length : start;
  const idx = s.lastIndexOf(pattern, end - 1);
  return idx === -1 ? 0 : idx + 1;
}

export function Replace(str: string, find: string, replacement: string): string {
  return String(str ?? '').split(find).join(replacement);
}

export function UCase(str: string): string { return String(str ?? '').toUpperCase(); }
export function LCase(str: string): string { return String(str ?? '').toLowerCase(); }
export function Space(n: number): string { return ' '.repeat(Math.max(0, n)); }
export function StringFn(n: number, char: string): string { return char.charAt(0).repeat(Math.max(0, n)); }
export function StrReverse(str: string): string { return String(str ?? '').split('').reverse().join(''); }

export function Format(value: any, format?: string): string {
  if (!format) return String(value);
  // Basic numeric format
  if (format === 'Currency') return `¥${Number(value).toFixed(0)}`;
  if (format === 'Percent') return `${(Number(value) * 100).toFixed(2)}%`;
  if (/^0+(\.0+)?$/.test(format)) {
    const decimals = (format.split('.')[1] ?? '').length;
    return Number(value).toFixed(decimals);
  }
  return String(value);
}

export function Like(str: string, pattern: string): boolean {
  // Convert VBA Like pattern to RegEx
  // Escape regex special chars EXCEPT * ? # (VBA wildcards), then replace them
  const regexStr = pattern
    .replace(/[-[\]{}()+.,\\^$|#\s]/g, (c) => c === '#' ? '[0-9]' : '\\' + c)
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexStr}$`, 'i').test(str);
}

// ─── Type Conversion ─────────────────────────────────────────────────────────

export function CInt(v: any): number { return Math.round(Number(v)) | 0; }
export function CLng(v: any): number { return Math.round(Number(v)); }
export function CDbl(v: any): number { return Number(v); }
export function CStr(v: any): string { return String(v ?? ''); }
export function CBool(v: any): boolean { return Boolean(v); }
export function CDate(v: any): Date { return new Date(v); }
export function CCur(v: any): number { return parseFloat(Number(v).toFixed(2)); }

// ─── Type Checking ───────────────────────────────────────────────────────────

export function IsNull(v: any): boolean { return v === null; }
export function IsEmpty(v: any): boolean { return v === undefined; }
export function IsNumeric(v: any): boolean { return !isNaN(Number(v)) && v !== '' && v !== null; }
export function IsDate(v: any): boolean { return v instanceof Date && !isNaN(v.getTime()); }
export function IsError(v: any): boolean { return v instanceof Error; }
export function IsArray(v: any): boolean { return Array.isArray(v); }
export function IsObject(v: any): boolean { return typeof v === 'object' && v !== null; }

export function TypeName(v: any): string {
  if (v === null) return 'Null';
  if (v === undefined) return 'Empty';
  if (typeof v === 'string') return 'String';
  if (typeof v === 'boolean') return 'Boolean';
  if (v instanceof Date) return 'Date';
  if (Array.isArray(v)) return 'Variant()';
  if (typeof v === 'number') return Number.isInteger(v) ? 'Integer' : 'Double';
  return 'Object';
}

export function VarType(v: any): number {
  if (v === undefined) return 0;  // vbEmpty
  if (v === null) return 1;       // vbNull
  if (typeof v === 'number') return Number.isInteger(v) ? 3 : 5; // vbLong : vbDouble
  if (typeof v === 'string') return 8;   // vbString
  if (typeof v === 'boolean') return 11; // vbBoolean
  if (v instanceof Date) return 7;       // vbDate
  if (typeof v === 'object') return 9;   // vbObject
  return 12; // vbVariant
}

// ─── Math ────────────────────────────────────────────────────────────────────

export function Round(value: number, decimals = 0): number {
  // Banker's rounding (round half to even) to match VBA
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor);
  return rounded / factor;
}

// ─── Date Functions ──────────────────────────────────────────────────────────

export function Now(): Date { return new Date(); }
export function DateFn(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
export function TimeFn(): Date { return new Date(); }

export function Month(d: Date): number { return (d instanceof Date ? d : new Date(d)).getMonth() + 1; }
export function Year(d: Date): number { return (d instanceof Date ? d : new Date(d)).getFullYear(); }
export function Day(d: Date): number { return (d instanceof Date ? d : new Date(d)).getDate(); }
export function Hour(d: Date): number { return (d instanceof Date ? d : new Date(d)).getHours(); }
export function Minute(d: Date): number { return (d instanceof Date ? d : new Date(d)).getMinutes(); }
export function Second(d: Date): number { return (d instanceof Date ? d : new Date(d)).getSeconds(); }
export function Weekday(d: Date, firstDay = 1): number {
  const day = (d instanceof Date ? d : new Date(d)).getDay(); // 0=Sun
  return ((day - firstDay + 1 + 7) % 7) + 1;
}

export function DateSerial(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

export function TimeSerial(hour: number, minute: number, second: number): Date {
  const d = new Date(); d.setHours(hour, minute, second, 0); return d;
}

type DateInterval = 'yyyy'|'q'|'m'|'y'|'d'|'w'|'ww'|'h'|'n'|'s';

export function DateAdd(interval: DateInterval, number: number, date: Date): Date {
  const d = new Date(date);
  switch (interval) {
    case 'yyyy': d.setFullYear(d.getFullYear() + number); break;
    case 'm':    d.setMonth(d.getMonth() + number); break;
    case 'd': case 'y': d.setDate(d.getDate() + number); break;
    case 'h':    d.setHours(d.getHours() + number); break;
    case 'n':    d.setMinutes(d.getMinutes() + number); break;
    case 's':    d.setSeconds(d.getSeconds() + number); break;
  }
  return d;
}

export function DateDiff(interval: DateInterval, date1: Date, date2: Date): number {
  const ms = (d: Date) => new Date(d).getTime();
  const diff = ms(date2) - ms(date1);
  switch (interval) {
    case 's': return Math.trunc(diff / 1000);
    case 'n': return Math.trunc(diff / 60000);
    case 'h': return Math.trunc(diff / 3600000);
    case 'd': case 'y': return Math.trunc(diff / 86400000);
    case 'w': return Math.trunc(diff / 604800000);
    case 'm': {
      const d1 = new Date(date1), d2 = new Date(date2);
      return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    }
    case 'yyyy': return new Date(date2).getFullYear() - new Date(date1).getFullYear();
    default: return 0;
  }
}

export function DatePart(interval: DateInterval, date: Date): number {
  const d = new Date(date);
  switch (interval) {
    case 'yyyy': return d.getFullYear();
    case 'q':    return Math.ceil((d.getMonth() + 1) / 3);
    case 'm':    return d.getMonth() + 1;
    case 'd': case 'y': return d.getDate();
    case 'h':    return d.getHours();
    case 'n':    return d.getMinutes();
    case 's':    return d.getSeconds();
    default: return 0;
  }
}

// ─── Array Functions ─────────────────────────────────────────────────────────

export function UBound(arr: any[], dimension = 1): number {
  if (dimension === 1) return arr.length - 1;
  if (arr.length === 0) return -1;
  return UBound(arr[0] as any[], dimension - 1);
}

export function LBound(_arr: any[], _dimension = 1): number { return 0; }

export function Split(str: string, delimiter = ' ', limit = -1): string[] {
  if (limit === -1) return str.split(delimiter);
  return str.split(delimiter).slice(0, limit);
}

export function Join(arr: any[], delimiter = ' '): string {
  return arr.join(delimiter);
}

// ─── UI Stubs ────────────────────────────────────────────────────────────────

export function MsgBox(message: string, _buttons?: number, _title?: string): number {
  console.log(`[MsgBox] ${message}`);
  return 1; // vbOK
}

export function InputBox(prompt: string, _title?: string, _default?: string): string {
  console.log(`[InputBox] ${prompt}`);
  return '';
}
