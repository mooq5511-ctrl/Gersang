$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$portraitRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/assets/mercenary-portraits/semireal-v1'))
$jpegCodec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
foreach ($portraitFile in Get-ChildItem -LiteralPath $portraitRoot -Filter '*.png' -File) {
  $source = [Drawing.Image]::FromFile($portraitFile.FullName)
  $bitmap = New-Object Drawing.Bitmap 512,768
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $parameters = New-Object Drawing.Imaging.EncoderParameters 1
  try {
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($source, 0, 0, 512, 768)
    $parameters.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality),([long]85)
    $bitmap.Save((Join-Path $portraitRoot ($portraitFile.BaseName + '.jpg')), $jpegCodec, $parameters)
  } finally {
    $parameters.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $source.Dispose()
  }
}
