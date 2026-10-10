import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const command = String.raw`
$ErrorActionPreference = 'Stop'
$sourcePath = [System.IO.Path]::GetFullPath('assets/game-icons.svg')
$outputPath = [System.IO.Path]::GetFullPath('assets/icons')
$bundlePath = [System.IO.Path]::GetFullPath('assets/icons.bundle.svg')
$sourceDoc = [xml](Get-Content -Raw $sourcePath)
$ns = [System.Xml.XmlNamespaceManager]::new($sourceDoc.NameTable)
$ns.AddNamespace('svg', 'http://www.w3.org/2000/svg')
$root = $sourceDoc.DocumentElement
$defs = $root.SelectSingleNode('./svg:defs', $ns)
$symbols = $root.SelectNodes('./svg:symbol', $ns)
if (-not $defs -or $symbols.Count -eq 0) { throw "No SVG symbols found in $sourcePath" }
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
function New-AssetDocument($symbolNodes) {
  $doc = [System.Xml.XmlDocument]::new()
  $svg = $doc.CreateElement('svg', 'http://www.w3.org/2000/svg')
  $svg.SetAttribute('width', '32')
  $svg.SetAttribute('height', '32')
  $svg.SetAttribute('viewBox', '0 0 32 32')
  [void]$doc.AppendChild($svg)
  [void]$svg.AppendChild($doc.ImportNode($defs, $true))
  foreach ($symbol in $symbolNodes) { [void]$svg.AppendChild($doc.ImportNode($symbol, $true)) }
  return $doc
}
foreach ($symbol in $symbols) {
  $doc = New-AssetDocument @($symbol)
  $doc.DocumentElement.SetAttribute('viewBox', $symbol.GetAttribute('viewBox'))
  $use = $doc.CreateElement('use', 'http://www.w3.org/2000/svg')
  $use.SetAttribute('href', '#' + $symbol.GetAttribute('id'))
  [void]$doc.DocumentElement.AppendChild($use)
  $doc.Save((Join-Path $outputPath ($symbol.GetAttribute('id') + '.svg')))
}
$bundle = New-AssetDocument $symbols
$bundle.Save($bundlePath)
Write-Output "Exported $($symbols.Count) standalone SVG icons and $bundlePath."
`;

execFileSync('powershell.exe', ['-NoProfile', '-Command', command], { cwd: root, stdio: 'inherit' });