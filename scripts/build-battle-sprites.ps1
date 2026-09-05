param([string]$ProjectRoot=(Split-Path -Parent $PSScriptRoot))
Add-Type -AssemblyName System.Drawing
$source=Join-Path $ProjectRoot 'public\assets\characters'
$target=Join-Path $ProjectRoot 'public\assets\sprites'
New-Item -ItemType Directory -Path $target -Force | Out-Null

function Write-SpriteSheet([string]$name,[string[]]$frames){
  $images=@($frames | ForEach-Object {[System.Drawing.Image]::FromFile((Join-Path $source $_))})
  try{
    $width=($images | Measure-Object Width -Maximum).Maximum
    $height=($images | Measure-Object Height -Maximum).Maximum
    $sheet=[System.Drawing.Bitmap]::new(($width*$images.Count),$height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try{
      $graphics=[System.Drawing.Graphics]::FromImage($sheet)
      try{
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        for($i=0;$i -lt $images.Count;$i++){
          $x=$i*$width+[math]::Floor(($width-$images[$i].Width)/2)
          $y=[math]::Floor(($height-$images[$i].Height)/2)
          $graphics.DrawImage($images[$i],$x,$y,$images[$i].Width,$images[$i].Height)
        }
      }finally{$graphics.Dispose()}
      $sheet.Save((Join-Path $target ($name+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    }finally{$sheet.Dispose()}
  }finally{$images | ForEach-Object {$_.Dispose()}}
}

$sets=@{
  'taiwan-idle'=@('char_003_MULAN_N.png','char_004_MULAN_R.png','char_003_MULAN_N.png','char_002_MULAN_D.png')
  'taiwan-attack'=@('char_000_MULAN_A1.png','char_001_MULAN_A2.png','char_000_MULAN_A1.png','char_003_MULAN_N.png')
  'korea-idle'=@('char_008_MUSUN_N.png','char_009_MUSUN_R.png','char_008_MUSUN_N.png','char_007_MUSUN_D.png')
  'korea-attack'=@('char_005_MUSUN_A1.png','char_006_MUSUN_A2.png','char_005_MUSUN_A1.png','char_008_MUSUN_N.png')
  'japan-idle'=@('char_016_Nobu_N.png','char_018_Nobu_R.png','char_016_Nobu_N.png','char_014_Nobu_D.png')
  'japan-attack'=@('char_010_Nobu_A.png','char_011_Nobu_A1.png','char_010_Nobu_A.png','char_016_Nobu_N.png')
  'china-idle'=@('char_026_SuRyong_N.png','char_027_SuRyong_R.png','char_026_SuRyong_N.png','char_025_SuRyong_D.png')
  'china-attack'=@('char_024_SuRyong_A1.png','char_024_SuRyong_A1.png','char_027_SuRyong_R.png','char_026_SuRyong_N.png')
  'enemy-idle'=@('char_056_pirate_skeleton_captain_N.png','char_057_pirate_skeleton_captain_R.png','char_056_pirate_skeleton_captain_N.png','char_055_pirate_skeleton_captain_D.png')
  'enemy-attack'=@('char_054_pirate_skeleton_captain_A.png','char_054_pirate_skeleton_captain_A.png','char_057_pirate_skeleton_captain_R.png','char_056_pirate_skeleton_captain_N.png')
}
foreach($entry in $sets.GetEnumerator()){Write-SpriteSheet $entry.Key $entry.Value}
