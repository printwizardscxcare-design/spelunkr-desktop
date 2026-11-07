$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetDirectory = Join-Path $PSScriptRoot '../assets'
New-Item -ItemType Directory -Path $assetDirectory -Force | Out-Null
$bitmap = New-Object System.Drawing.Bitmap 256,256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = 'AntiAlias'
$graphics.Clear([System.Drawing.Color]::FromArgb(28,10,87))
$accent = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(216,255,128)),12
$screenBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(216,255,128))
$darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28,10,87))
$graphics.DrawLine($accent,98,40,127,67)
$graphics.DrawLine($accent,157,40,128,67)
$graphics.FillRectangle($screenBrush,40,68,176,142)
$graphics.FillRectangle($darkBrush,53,81,132,116)
$graphics.FillEllipse($screenBrush,194,100,10,10)
$graphics.FillEllipse($screenBrush,194,128,10,10)
$graphics.DrawLine($accent,80,219,176,219)
$graphics.DrawLine($accent,128,205,128,220)
$graphics.DrawLine($accent,78,126,78,156)
$graphics.DrawLine($accent,106,112,106,156)
$graphics.DrawLine($accent,134,100,134,156)
$graphics.DrawLine($accent,162,119,162,156)
$pngPath = Join-Path $assetDirectory 'icon.png'
$bitmap.Save($pngPath,[System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$iconPath = Join-Path $assetDirectory 'icon.ico'
$writer = New-Object System.IO.BinaryWriter ([System.IO.File]::Create($iconPath))
try {
  $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
  $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
  $writer.Write([uint16]1); $writer.Write([uint16]32)
  $writer.Write([uint32]$pngBytes.Length); $writer.Write([uint32]22)
  $writer.Write($pngBytes)
} finally { $writer.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $accent.Dispose(); $screenBrush.Dispose(); $darkBrush.Dispose() }
