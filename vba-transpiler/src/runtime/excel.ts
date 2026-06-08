// Excel Function Runtime Library — TypeScript equivalents of Excel worksheet functions

type Range = number[];

// ─── Aggregate Functions ─────────────────────────────────────────────────────

export function SUM(...ranges: (number | number[])[]): number {
  return flatten(ranges).reduce((s, v) => s + (Number(v) || 0), 0);
}

export function AVERAGE(...ranges: (number | number[])[]): number {
  const vals = flatten(ranges).filter(v => typeof v === 'number' && !isNaN(v));
  return vals.length === 0 ? 0 : vals.reduce((s, v) => s + v, 0) / vals.length;
}

export function COUNT(...ranges: any[]): number {
  return flatten(ranges).filter(v => v !== null && v !== undefined && typeof v === 'number' && !isNaN(v)).length;
}

export function COUNTA(...ranges: any[]): number {
  return flatten(ranges).filter(v => v !== null && v !== undefined && v !== '').length;
}

export function COUNTIF(range: any[], criteria: any): number {
  const test = buildCriteriaTest(criteria);
  return range.filter(test).length;
}

export function SUMIF(range: any[], criteria: any, sumRange?: any[]): number {
  const test = buildCriteriaTest(criteria);
  const sum = sumRange ?? range;
  return range.reduce((total, v, i) => total + (test(v) ? (Number(sum[i]) || 0) : 0), 0);
}

export function AVERAGEIF(range: any[], criteria: any, avgRange?: any[]): number {
  const test = buildCriteriaTest(criteria);
  const avg = avgRange ?? range;
  let count = 0, total = 0;
  range.forEach((v, i) => { if (test(v)) { total += Number(avg[i]) || 0; count++; } });
  return count === 0 ? 0 : total / count;
}

export function MAX(...ranges: (number | number[])[]): number {
  const vals = flatten(ranges).filter(v => typeof v === 'number' && !isNaN(v));
  return vals.length === 0 ? 0 : Math.max(...vals);
}

export function MIN(...ranges: (number | number[])[]): number {
  const vals = flatten(ranges).filter(v => typeof v === 'number' && !isNaN(v));
  return vals.length === 0 ? 0 : Math.min(...vals);
}

export function MEDIAN(...ranges: (number | number[])[]): number {
  const sorted = flatten(ranges).filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function STDEV(...ranges: (number | number[])[]): number {
  const vals = flatten(ranges).filter(v => typeof v === 'number' && !isNaN(v));
  if (vals.length < 2) return 0;
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(variance);
}

// ─── Lookup Functions ────────────────────────────────────────────────────────

export function VLOOKUP(lookupValue: any, table: any[][], colIndex: number, approximate = true): any {
  const rows = table;
  if (approximate) {
    let match = rows[0];
    for (const row of rows) {
      if (row[0] <= lookupValue) match = row;
      else break;
    }
    return match?.[colIndex - 1] ?? '#N/A';
  }
  const row = rows.find(r => r[0] === lookupValue);
  return row?.[colIndex - 1] ?? '#N/A';
}

export function HLOOKUP(lookupValue: any, table: any[][], rowIndex: number, approximate = true): any {
  if (table.length === 0) return '#N/A';
  const headers = table[0];
  let colIdx = -1;
  if (approximate) {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] <= lookupValue) colIdx = i;
      else break;
    }
  } else {
    colIdx = headers.indexOf(lookupValue);
  }
  return colIdx === -1 ? '#N/A' : (table[rowIndex - 1]?.[colIdx] ?? '#N/A');
}

export function INDEX(range: any[][], rowNum: number, colNum = 1): any {
  if (rowNum === 0) return range.map(r => r[colNum - 1]);
  if (colNum === 0) return range[rowNum - 1];
  return range[rowNum - 1]?.[colNum - 1] ?? '#REF!';
}

export function MATCH(lookupValue: any, lookupRange: any[], matchType = 1): number {
  if (matchType === 0) {
    const idx = lookupRange.indexOf(lookupValue);
    return idx === -1 ? -1 : idx + 1;
  }
  if (matchType === 1) {
    let lastMatch = -1;
    for (let i = 0; i < lookupRange.length; i++) {
      if (lookupRange[i] <= lookupValue) lastMatch = i + 1;
      else break;
    }
    return lastMatch;
  }
  // matchType === -1: descending
  for (let i = 0; i < lookupRange.length; i++) {
    if (lookupRange[i] <= lookupValue) return i + 1;
  }
  return -1;
}

// ─── Logical Functions ───────────────────────────────────────────────────────

export function IF(condition: boolean, trueVal: any, falseVal: any = false): any {
  return condition ? trueVal : falseVal;
}

export function AND(...conditions: boolean[]): boolean {
  return conditions.every(Boolean);
}

export function OR(...conditions: boolean[]): boolean {
  return conditions.some(Boolean);
}

export function NOT(condition: boolean): boolean { return !condition; }

export function IFERROR(value: any, valueIfError: any): any {
  if (value instanceof Error || value === '#N/A' || value === '#REF!' || value === '#VALUE!') {
    return valueIfError;
  }
  return value;
}

export function IFNA(value: any, valueIfNA: any): any {
  return value === '#N/A' ? valueIfNA : value;
}

export function SWITCH(expression: any, ...pairs: any[]): any {
  for (let i = 0; i < pairs.length - 1; i += 2) {
    if (expression === pairs[i]) return pairs[i + 1];
  }
  // Default value if odd number of pairs
  if (pairs.length % 2 === 1) return pairs[pairs.length - 1];
  return '#N/A';
}

// ─── Text Functions ──────────────────────────────────────────────────────────

export function CONCATENATE(...args: any[]): string {
  return args.map(String).join('');
}

export function TEXT(value: any, format: string): string {
  const n = Number(value);
  if (isNaN(n)) return String(value);
  const decimals = (format.split('.')[1] ?? '').replace(/[^0#]/g, '').length;
  return n.toFixed(decimals);
}

export function LEFT(str: string, n: number): string { return String(str).slice(0, n); }
export function RIGHT(str: string, n: number): string { const s = String(str); return s.slice(Math.max(0, s.length - n)); }
export function MID(str: string, start: number, length: number): string { return String(str).substr(start - 1, length); }
export function LEN(str: any): number { return String(str ?? '').length; }
export function TRIM(str: string): string { return String(str).replace(/\s+/g, ' ').trim(); }
export function UPPER(str: string): string { return String(str).toUpperCase(); }
export function LOWER(str: string): string { return String(str).toLowerCase(); }
export function FIND(findText: string, withinText: string, startNum = 1): number {
  const idx = String(withinText).indexOf(findText, startNum - 1);
  return idx === -1 ? -1 : idx + 1;
}
export function SUBSTITUTE(text: string, oldText: string, newText: string, occurrence?: number): string {
  if (occurrence === undefined) return text.split(oldText).join(newText);
  let count = 0;
  return text.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (match) => {
    count++;
    return count === occurrence ? newText : match;
  });
}

// ─── Math Functions ──────────────────────────────────────────────────────────

export function ROUND(n: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(n * factor) / factor;
}

export function ROUNDUP(n: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.ceil(n * factor) / factor;
}

export function ROUNDDOWN(n: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.floor(n * factor) / factor;
}

export function MOD(n: number, divisor: number): number { return n % divisor; }
export function ABS(n: number): number { return Math.abs(n); }
export function INT(n: number): number { return Math.floor(n); }
export function SQRT(n: number): number { return Math.sqrt(n); }
export function POWER(base: number, exp: number): number { return Math.pow(base, exp); }
export function LOG(n: number, base = 10): number { return Math.log(n) / Math.log(base); }
export function LN(n: number): number { return Math.log(n); }
export function EXP(n: number): number { return Math.exp(n); }
export function PI(): number { return Math.PI; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flatten(ranges: any[]): any[] {
  return ranges.flatMap(r => Array.isArray(r) ? r.flat(Infinity) : [r]);
}

function buildCriteriaTest(criteria: any): (v: any) => boolean {
  if (typeof criteria === 'function') return criteria;
  if (typeof criteria === 'string') {
    const match = criteria.match(/^([><=!]{1,2})(.+)$/);
    if (match) {
      const [, op, val] = match;
      const numVal = Number(val);
      const strVal = val;
      switch (op) {
        case '>':  return v => Number(v) > numVal;
        case '>=': return v => Number(v) >= numVal;
        case '<':  return v => Number(v) < numVal;
        case '<=': return v => Number(v) <= numVal;
        case '<>': case '!=': return v => String(v) !== strVal;
        case '=':  return v => String(v) === strVal;
      }
    }
    // Wildcard match
    if (criteria.includes('*') || criteria.includes('?')) {
      const pattern = criteria.replace(/\*/g, '.*').replace(/\?/g, '.');
      const rx = new RegExp(`^${pattern}$`, 'i');
      return v => rx.test(String(v));
    }
    return v => String(v) === criteria;
  }
  return v => v === criteria;
}
