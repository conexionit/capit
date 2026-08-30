const { execFileSync } = require('child_process');

const PS_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class CapitWin32 {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
param($titleFilter)
$procs = Get-Process | Where-Object { $_.MainWindowTitle -like "*$titleFilter*" -and $_.MainWindowHandle -ne 0 }
if ($procs) {
  $hwnd = $procs[0].MainWindowHandle
  $rect = New-Object CapitWin32+RECT
  [CapitWin32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
  $obj = [ordered]@{
    x = $rect.Left
    y = $rect.Top
    width = ($rect.Right - $rect.Left)
    height = ($rect.Bottom - $rect.Top)
  }
  $obj | ConvertTo-Json -Compress
}
`;

// titleFilter: substring del nombre de la ventana (tal como aparece en desktopCapturer)
function getWindowBoundsByTitle(titleFilter) {
  try {
    const safe = String(titleFilter).replace(/["'`$]/g, '');
    const out = execFileSync(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', PS_SCRIPT, '-titleFilter', safe],
      { encoding: 'utf-8', windowsHide: true, timeout: 3000 }
    );
    const trimmed = out.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
  } catch (err) {
    return null;
  }
}

module.exports = { getWindowBoundsByTitle };
