$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$assemblyRoot = Join-Path $env:WINDIR 'Microsoft.NET/assembly/GAC_MSIL'
$references = @('UIAutomationClient','UIAutomationTypes','WindowsBase') | ForEach-Object {
    $reference = Get-ChildItem -LiteralPath (Join-Path $assemblyRoot $_) -Filter "$_.dll" -Recurse | Select-Object -First 1
    if (!$reference) { throw "Missing .NET Framework assembly: $_" }
    "/reference:$($reference.FullName)"
}
$outputDirectory = Join-Path $PSScriptRoot '../native/bin'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
& $compiler /nologo /target:exe /platform:x64 /optimize+ '/reference:System.Web.Extensions.dll' @references "/out:$outputDirectory/CaptionReader.exe" (Join-Path $PSScriptRoot '../native/CaptionReader.cs')
if ($LASTEXITCODE -ne 0) { throw 'Caption helper compilation failed' }
