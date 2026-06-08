// VBA Transpiler Integration Tests

import { transpileVBA } from '../src/index';
import * as vba from '../src/runtime/vba';
import * as excel from '../src/runtime/excel';

// ─── Runtime Library Tests ───────────────────────────────────────────────────

describe('VBA Runtime - String Functions', () => {
  test('Left', () => { expect(vba.Left('Hello World', 5)).toBe('Hello'); });
  test('Right', () => { expect(vba.Right('Hello World', 5)).toBe('World'); });
  test('Mid', () => { expect(vba.Mid('Hello World', 7, 5)).toBe('World'); });
  test('Mid no length', () => { expect(vba.Mid('Hello World', 7)).toBe('World'); });
  test('Len', () => { expect(vba.Len('Hello')).toBe(5); });
  test('Trim', () => { expect(vba.Trim('  hello  ')).toBe('hello'); });
  test('InStr basic', () => { expect(vba.InStr('Hello World', 'World')).toBe(7); });
  test('InStr not found', () => { expect(vba.InStr('Hello', 'xyz')).toBe(0); });
  test('Replace', () => { expect(vba.Replace('Hello World', 'World', 'VBA')).toBe('Hello VBA'); });
  test('UCase', () => { expect(vba.UCase('hello')).toBe('HELLO'); });
  test('LCase', () => { expect(vba.LCase('HELLO')).toBe('hello'); });
  test('Space', () => { expect(vba.Space(3)).toBe('   '); });
  test('Like wildcard', () => { expect(vba.Like('Hello World', 'Hello*')).toBe(true); });
  test('Like no match', () => { expect(vba.Like('Hello', 'World*')).toBe(false); });
});

describe('VBA Runtime - Type Conversion', () => {
  test('CInt', () => { expect(vba.CInt('42')).toBe(42); });
  test('CDbl', () => { expect(vba.CDbl('3.14')).toBe(3.14); });
  test('CStr', () => { expect(vba.CStr(42)).toBe('42'); });
  test('CBool', () => { expect(vba.CBool(1)).toBe(true); });
  test('CBool false', () => { expect(vba.CBool(0)).toBe(false); });
});

describe('VBA Runtime - Type Checking', () => {
  test('IsNull', () => { expect(vba.IsNull(null)).toBe(true); expect(vba.IsNull(0)).toBe(false); });
  test('IsEmpty', () => { expect(vba.IsEmpty(undefined)).toBe(true); expect(vba.IsEmpty('')).toBe(false); });
  test('IsNumeric', () => { expect(vba.IsNumeric('42')).toBe(true); expect(vba.IsNumeric('abc')).toBe(false); });
  test('TypeName string', () => { expect(vba.TypeName('hello')).toBe('String'); });
  test('TypeName number', () => { expect(vba.TypeName(42)).toBe('Integer'); });
  test('TypeName null', () => { expect(vba.TypeName(null)).toBe('Null'); });
});

describe('VBA Runtime - Date Functions', () => {
  test('Year', () => { expect(vba.Year(new Date('2026-01-15'))).toBe(2026); });
  test('Month', () => { expect(vba.Month(new Date('2026-01-15'))).toBe(1); });
  test('Day', () => { expect(vba.Day(new Date('2026-01-15'))).toBe(15); });
  test('DateAdd months', () => {
    const result = vba.DateAdd('m', 3, new Date('2026-01-15'));
    expect(result.getMonth()).toBe(3); // April (0-indexed)
  });
  test('DateDiff years', () => {
    const d1 = new Date('2020-01-01');
    const d2 = new Date('2026-01-01');
    expect(vba.DateDiff('yyyy', d1, d2)).toBe(6);
  });
});

describe('VBA Runtime - Array Functions', () => {
  test('UBound', () => { expect(vba.UBound([1, 2, 3, 4, 5])).toBe(4); });
  test('LBound', () => { expect(vba.LBound([1, 2, 3])).toBe(0); });
  test('Split', () => { expect(vba.Split('a,b,c', ',')).toEqual(['a', 'b', 'c']); });
  test('Join', () => { expect(vba.Join(['a', 'b', 'c'], '-')).toBe('a-b-c'); });
});

// ─── Excel Runtime Tests ─────────────────────────────────────────────────────

describe('Excel Runtime - Aggregate', () => {
  test('SUM', () => { expect(excel.SUM([1, 2, 3, 4, 5])).toBe(15); });
  test('AVERAGE', () => { expect(excel.AVERAGE([1, 2, 3, 4, 5])).toBe(3); });
  test('COUNT', () => { expect(excel.COUNT([1, 'a', 2, null, 3])).toBe(3); });
  test('MAX', () => { expect(excel.MAX([3, 1, 4, 1, 5, 9, 2, 6])).toBe(9); });
  test('MIN', () => { expect(excel.MIN([3, 1, 4, 1, 5, 9, 2, 6])).toBe(1); });
  test('COUNTIF gt', () => { expect(excel.COUNTIF([1, 2, 3, 4, 5], '>3')).toBe(2); });
  test('SUMIF', () => { expect(excel.SUMIF([1, 2, 3, 4, 5], '>2')).toBe(12); });
});

describe('Excel Runtime - Lookup', () => {
  test('VLOOKUP exact', () => {
    const table = [['A', 1], ['B', 2], ['C', 3]];
    expect(excel.VLOOKUP('B', table, 2, false)).toBe(2);
  });
  test('MATCH exact', () => {
    expect(excel.MATCH('B', ['A', 'B', 'C'], 0)).toBe(2);
  });
  test('IF true', () => { expect(excel.IF(true, 'yes', 'no')).toBe('yes'); });
  test('IF false', () => { expect(excel.IF(false, 'yes', 'no')).toBe('no'); });
  test('IFERROR', () => { expect(excel.IFERROR('#N/A', 'default')).toBe('default'); });
});

// ─── Transpiler Tests ────────────────────────────────────────────────────────

describe('VBA Transpiler - Basic Functions', () => {
  test('Simple function', () => {
    const vbaCode = `
Function AddNumbers(a As Integer, b As Integer) As Integer
  AddNumbers = a + b
End Function
`;
    const result = transpileVBA(vbaCode, { moduleName: 'TestModule' });
    expect(result.code).toContain('function AddNumbers');
    expect(result.code).toContain('a: number');
    expect(result.code).toContain('b: number');
    expect(result.coverage).toBeGreaterThan(0.8);
  });

  test('Sub with no return', () => {
    const vbaCode = `
Sub PrintHello(name As String)
  MsgBox "Hello " & name
End Sub
`;
    const result = transpileVBA(vbaCode);
    expect(result.code).toContain('function PrintHello');
    expect(result.code).toContain(': void');
    expect(result.code).toContain('vba.MsgBox');
  });

  test('If statement', () => {
    const vbaCode = `
Function CheckAge(age As Integer) As String
  If age >= 18 Then
    CheckAge = "Adult"
  Else
    CheckAge = "Minor"
  End If
End Function
`;
    const result = transpileVBA(vbaCode);
    expect(result.code).toContain('if (');
    expect(result.code).toContain('} else {');
    expect(result.coverage).toBeGreaterThan(0.8);
  });

  test('For loop', () => {
    const vbaCode = `
Function SumRange(n As Integer) As Long
  Dim total As Long
  Dim i As Integer
  For i = 1 To n
    total = total + i
  Next i
  SumRange = total
End Function
`;
    const result = transpileVBA(vbaCode);
    expect(result.code).toContain('for (let i: number');
    expect(result.code).toContain('i <= ');
    expect(result.coverage).toBeGreaterThan(0.8);
  });

  test('String concatenation', () => {
    const vbaCode = `
Function Greet(name As String) As String
  Greet = "Hello, " & name & "!"
End Function
`;
    const result = transpileVBA(vbaCode);
    expect(result.code).toContain('String(');
    expect(result.coverage).toBeGreaterThan(0.8);
  });

  test('Select Case', () => {
    const vbaCode = `
Function GetDay(n As Integer) As String
  Select Case n
    Case 1
      GetDay = "Mon"
    Case 2
      GetDay = "Tue"
    Case Else
      GetDay = "Other"
  End Select
End Function
`;
    const result = transpileVBA(vbaCode);
    expect(result.code).toContain('switch (');
    expect(result.code).toContain('default:');
    expect(result.coverage).toBeGreaterThan(0.8);
  });

  test('Variable declarations', () => {
    const vbaCode = `
Sub DeclareVars()
  Dim name As String
  Dim count As Integer
  Dim rate As Double
  Const PI As Double = 3.14159
End Sub
`;
    const result = transpileVBA(vbaCode);
    expect(result.code).toContain('let name: string');
    expect(result.code).toContain('let count: number');
    expect(result.code).toContain('const PI: number');
  });
});

describe('VBA Transpiler - Built-in Calls', () => {
  test('String functions mapped', () => {
    const vbaCode = `
Function ProcessName(s As String) As String
  ProcessName = UCase(Trim(Left(s, 10)))
End Function
`;
    const result = transpileVBA(vbaCode);
    expect(result.code).toContain('vba.UCase');
    expect(result.code).toContain('vba.Trim');
    expect(result.code).toContain('vba.Left');
  });

  test('Date functions mapped', () => {
    const vbaCode = `
Function GetYear(d As Date) As Integer
  GetYear = Year(d)
End Function
`;
    const result = transpileVBA(vbaCode);
    expect(result.code).toContain('vba.Year');
  });
});

describe('VBA Transpiler - Coverage Target', () => {
  test('Financial calculation template', () => {
    const vbaCode = `
Function CalculateTax(income As Double, rate As Double) As Double
  Dim tax As Double
  If income <= 0 Then
    CalculateTax = 0
    Exit Function
  End If
  tax = income * rate
  If tax > 1000000 Then
    tax = tax * 0.9
  End If
  CalculateTax = Round(tax, 0)
End Function

Function FormatCurrency(amount As Double) As String
  FormatCurrency = "¥" & CStr(CLng(amount))
End Function

Sub ProcessPayroll(employees() As String, salaries() As Double)
  Dim i As Integer
  For i = 0 To UBound(employees)
    Dim tax As Double
    tax = CalculateTax(salaries(i), 0.2)
    MsgBox employees(i) & ": " & FormatCurrency(salaries(i) - tax)
  Next i
End Sub
`;
    const result = transpileVBA(vbaCode);
    expect(result.coverage).toBeGreaterThan(0.9); // 90%+ target
    expect(result.code).toContain('function CalculateTax');
    expect(result.code).toContain('function FormatCurrency');
    expect(result.code).toContain('function ProcessPayroll');
    expect(result.warnings).toHaveLength(0);
  });
});
