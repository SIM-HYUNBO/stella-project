param([Parameter(Mandatory=$true)][string]$Source, [string]$Foreground)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskLoadedImage = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source))
try { $taskSourceImage = $taskLoadedImage.Clone() } finally { $taskLoadedImage.Dispose() }
$taskBackground = $taskSourceImage.GetPixel(0, 0)
function Write-Icon([string]$RelativePath, [int]$Size, [double]$Scale = 1, [bool]$Round = $false, [bool]$Transparent = $false, [System.Drawing.Image]$Image = $taskSourceImage) {
    $taskDestination = Join-Path $taskRoot $RelativePath
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($taskDestination)) | Out-Null
    $taskBitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $taskGraphics = [System.Drawing.Graphics]::FromImage($taskBitmap)
    try {
        $taskGraphics.Clear([System.Drawing.Color]::Transparent)
        $taskGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $taskGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $taskGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        if ($Round) {
            $taskClip = New-Object System.Drawing.Drawing2D.GraphicsPath
            try { $taskClip.AddEllipse(0, 0, $Size, $Size); $taskGraphics.SetClip($taskClip) } finally { $taskClip.Dispose() }
        }
        if ($Scale -lt 1 -and !$Transparent) { $taskGraphics.Clear($taskBackground) }
        $taskEdge = [int][Math]::Round($Size * $Scale)
        $taskOffset = [int][Math]::Round(($Size - $taskEdge) / 2)
        $taskGraphics.DrawImage($Image, $taskOffset, $taskOffset, $taskEdge, $taskEdge)
        $taskBitmap.Save($taskDestination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $taskGraphics.Dispose(); $taskBitmap.Dispose() }
}
try {
    if ((Resolve-Path -LiteralPath $Source).Path -ne [System.IO.Path]::GetFullPath((Join-Path $taskRoot 'public/app-icons/duck-cap.png'))) {
        Write-Icon 'public/app-icons/duck-cap.png' 1024
    }
    foreach ($taskSize in @(32, 180, 192, 512)) { Write-Icon "public/app-icons/duck-cap-$taskSize.png" $taskSize }
    Write-Icon 'public/app-icons/duck-cap-maskable-512.png' 512
    Write-Icon 'app/icon.png' 512
    $taskDensities = @(@('mdpi',48,108), @('hdpi',72,162), @('xhdpi',96,216), @('xxhdpi',144,324), @('xxxhdpi',192,432))
    $taskForegroundImage = if ($Foreground) { [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Foreground)) } else { $null }
    foreach ($taskDensity in $taskDensities) {
        $taskBase = "android/app/src/main/res/mipmap-$($taskDensity[0])"
        Write-Icon "$taskBase/ic_launcher.png" $taskDensity[1]
        Write-Icon "$taskBase/ic_launcher_round.png" $taskDensity[1] 1 $true
        if ($taskForegroundImage) { Write-Icon "$taskBase/ic_launcher_foreground.png" $taskDensity[2] 0.8 $false $true $taskForegroundImage }
        else { Write-Icon "$taskBase/ic_launcher_foreground.png" $taskDensity[2] 0.8 }
    }
    if ($taskForegroundImage) { $taskForegroundImage.Dispose() }
    Write-Output 'PWA, Apple touch, favicon and Android launcher icons updated.'
} finally { $taskSourceImage.Dispose() }
