param([string]$Only = "", [string]$Sets = "ios,play,tab7,tab10,feature", [string]$Out = "")
# Captioned store screenshots and the Play feature graphic, rendered by headless Edge
# from the pages prepare.py serves (run it first, in another terminal). Writes straight
# into store-assets/. -Only 3-event re-renders one screen; -Sets ios renders one set.
Add-Type -AssemblyName System.Drawing
if (-not $Out) { $Out = (Resolve-Path "$PSScriptRoot\..\..\store-assets").Path }
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# Canvas size in CSS px times the scale = the store's pixel size (compose.html has the
# matching device presets).
$presets = @{
  ios   = @{ W = 440; H = 956;  Scale = 3; Port = 4801; Prefix = "appstore-6.9" }     # 1320 x 2868, App Store 6.9"
  play  = @{ W = 360; H = 640;  Scale = 3; Port = 4802; Prefix = "play-screenshot" }  # 1080 x 1920
  tab7  = @{ W = 612; H = 1088; Scale = 2; Port = 4802; Prefix = "play-tablet7" }     # 1224 x 2176
  tab10 = @{ W = 810; H = 1440; Scale = 2; Port = 4802; Prefix = "play-tablet10" }    # 1620 x 2880
}
# Ids are the review account's sample circle, event, chat and profile (sample world,
# migration 0065, keeps them current).
$screens = @(
  @{ Id = "1-circles";  Path = "/circles"; H1 = "Find your people"; H2 = "Circles for your city, your culture and the things you love" },
  @{ Id = "2-circle";   Path = "/circles/43f41d33-0a0e-4af2-b18e-671dd3e29534"; H1 = "Meetups near you"; H2 = "Every circle has events on the calendar" },
  @{ Id = "3-event";    Path = "/circles/7c3ef25d-26b1-4359-a8d4-519bb1d707e4/events/de5fedb5-3df2-43cf-960c-429ea7e7ae28"; H1 = "See who's going"; H2 = "RSVP, then meet your circle in person" },
  @{ Id = "4-discover"; Path = "/discover"; H1 = "People who get you"; H2 = "For friendship, romance, business or mentorship" },
  @{ Id = "5-chat";     Path = "/chat/91bd9749-201c-469f-8384-b6b8b00037db"; H1 = "Chat and make plans"; H2 = "Message your connections, reply and react" },
  @{ Id = "6-safety";   Path = "/settings/safety"; H1 = "Safety built in"; H2 = "Share your plans, check in, and report or block in two taps" },
  @{ Id = "7-profile";  Path = "/user/f77390aa-018f-43ed-bfb6-1a86048876b1"; H1 = "Know who you meet"; H2 = "Languages, interests and what they're looking for" }
)

function Render($url, $w, $h, $scale, $file, $profile) {
  $raw = "$env:TEMP\halka-shot-raw.png"
  & $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=$scale "--window-size=$($w + 40),$($h + 40)" --virtual-time-budget=20000 "--user-data-dir=$env:TEMP\halka-edge-$profile" "--screenshot=$raw" $url 2>$null | Out-Null
  $W = $w * $scale; $H = $h * $scale
  $img = [System.Drawing.Image]::FromFile($raw)
  # 24-bit, no alpha channel: App Store Connect rejects screenshots that have one.
  $bmp = New-Object System.Drawing.Bitmap $W, $H, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $W, $H), (New-Object System.Drawing.Rectangle 0, 0, $W, $H), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $img.Dispose()
  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  "$file ${W}x${H}"
}

# A fresh browser profile each run, so no cached settings or data from a previous one.
Remove-Item -Recurse -Force "$env:TEMP\halka-edge-*" -ErrorAction SilentlyContinue

foreach ($setName in $Sets.Split(",")) {
  if ($setName -eq "feature") {
    if (-not $Only) { Render "http://localhost:4802/feature.html" 1024 500 1 "$Out\play-feature-1024x500.png" "feature" }
    continue
  }
  $p = $presets[$setName]
  foreach ($s in $screens) {
    if ($Only -and $s.Id -ne $Only) { continue }
    $q = "c=$setName&p=$([uri]::EscapeDataString($s.Path))&h1=$([uri]::EscapeDataString($s.H1))&h2=$([uri]::EscapeDataString($s.H2))"
    Render "http://localhost:$($p.Port)/compose.html?$q" $p.W $p.H $p.Scale "$Out\$($p.Prefix)-$($s.Id).png" $setName
  }
}
