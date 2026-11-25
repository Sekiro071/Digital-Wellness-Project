$ErrorActionPreference='Stop'
$root=(Get-Location).Path
$source=Join-Path $root 'output/presentation/Good_Signal_Project_Presentation_Final.pptx'
$dest=Join-Path $root 'output/presentation/Good_Signal_Project_Presentation_Polished.pptx'
$app=New-Object -ComObject PowerPoint.Application
$work=Join-Path $root ("tmp/ppt-polish/work-"+[guid]::NewGuid()+".pptx")
Copy-Item -LiteralPath $source -Destination $work
$p=$app.Presentations.Open($work,0,0,0)
function Color([string]$hex) {
 [Convert]::ToInt32($hex.Substring(0,2),16) + 256*[Convert]::ToInt32($hex.Substring(2,2),16) + 65536*[Convert]::ToInt32($hex.Substring(4,2),16)
}
function Box($slide,$name,$x,$y,$w,$h,$hex) {
 $shape=$slide.Shapes.AddShape(1,$x,$y,$w,$h)
 $shape.Name=$name
 $shape.Line.Visible=0
 $shape.Fill.ForeColor.RGB=(Color $hex)
 $shape
}
function Label($slide,$name,$value,$x,$y,$w,$h,$size,$hex,$bold=0,$font='Arial') {
 $shape=$slide.Shapes.AddTextbox(1,$x,$y,$w,$h)
 $shape.Name=$name
 $frame=$shape.TextFrame
 $frame.MarginLeft=0
 $frame.MarginRight=0
 $frame.MarginTop=0
 $frame.MarginBottom=0
 $frame.AutoSize=0
 $frame.WordWrap=-1
 $range=$frame.TextRange
 $range.Text=$value
 $range.Font.Name=$font
 $range.Font.Size=$size
 if($bold){$range.Font.Bold=-1}else{$range.Font.Bold=0}
 $range.Font.Color.RGB=(Color $hex)
 $shape
}
function Fade($slide,$shape,$trigger,$delay=0) {
 $effect=$slide.TimeLine.MainSequence.AddEffect($shape,10,0,$trigger)
 $effect.Timing.Duration=[single]0.25
 $effect.Timing.TriggerDelayTime=[single]$delay
}
function Beat($slide,[int[]]$ids,[int]$trigger=3) {
 for($i=0;$i -lt $ids.Count;$i++) {
  $id=$ids[$i]
  $shape=$slide.Shapes.Item($id)
  if($shape.Id -ne $id){throw "Missing shape $id on slide $($slide.SlideIndex)"}
  Fade $slide $shape $(if($i -eq 0){$trigger}else{2})
 }
}
try {
 $s=$p.Slides.Item(1)
 if($s.Shapes.Count -ne 14 -or $p.Slides.Count -ne 8){throw 'Unexpected source layout'}
 for($i=$s.Shapes.Count;$i -ge 1;$i--){$s.Shapes.Item($i).Delete()}
 $s.FollowMasterBackground=0
 $s.Background.Fill.Solid()
 $s.Background.Fill.ForeColor.RGB=(Color 'F7FAFB')
 $null=Box $s 'Deck accent' 0 0 960 8 'D4FF35'
 $null=Label $s 'Project category' 'DIGITAL WELLNESS RESOURCE HUB' 48 49 440 19 12 '326353' -1
 $title=Label $s 'Project title' 'Good Signal' 48 96 445 82 65 '0D2634' -1 'Aptos Display'
 $sub=Label $s 'Project description' 'A student hub for comparing digital wellness tools, following setup guides and starting a focus session.' 52 190 415 90 23 '345360'
 $null=Box $s 'Audience separator' 52 315 398 1 'B5C8CE'
 $audience=Label $s 'Intended students' 'For college and university students' 52 336 399 27 17 '0D2634' -1
 $detail=Label $s 'Research status' 'Ages 18–24 · Student validation pending' 52 369 410 24 14 '516A78'
 $panel=Box $s 'Screenshot backing' 509 93 403 312 'E5EFF1'
 $pic=$s.Shapes.AddPicture((Join-Path $root 'output/sol-theme-checks/home-1440-light.png'),0,-1,524,111,-1,-1)
 $pic.Name='Good Signal website screenshot'
 $pic.AlternativeText='Good Signal home page showing a focus timer and resource shortcuts'
 $pic.LockAspectRatio=-1
 $pic.Width=373
 if($pic.Height -gt 247){$pic.Height=247}
 $pic.Top=111+(247-$pic.Height)/2
 $pic.Left=524+(373-$pic.Width)/2
 $caption=Label $s 'Screenshot caption' 'Good Signal website' 526 373 365 21 13 '345360' -1
 $null=Box $s 'Footer rule' 48 507 864 1 'B5C8CE'
 $null=Label $s 'Presentation date' '17 NOVEMBER 2026' 48 516 340 13 9 '516A78' -1
 $null=Label $s 'Page number' '01' 893 515 19 15 10 '0D2634' -1
 Write-Host "Cover rebuilt"
 Fade $s $title 3
 Fade $s $sub 3 0.04
 Fade $s $panel 3 0.04
 Fade $s $pic 2
 Fade $s $caption 2
 Fade $s $audience 2
 Fade $s $detail 2

 Write-Host "Cover animation added"
 $p.Slides.Item(4).Shapes.Item(3).TextFrame.TextRange.Text='How the directory compares tools'
 $p.Slides.Item(5).Shapes.Item(3).TextFrame.TextRange.Text='Three setup guides'
 $p.Slides.Item(7).Shapes.Item(3).TextFrame.TextRange.Text='Website verification results'
 foreach($entry in @(@(4,10,11,12),@(7,19,20,21))) {
  $slide=$p.Slides.Item($entry[0])
  $slide.Shapes.Item($entry[1]).Fill.ForeColor.RGB=(Color 'E2EDF0')
  $slide.Shapes.Item($entry[2]).TextFrame.TextRange.Font.Color.RGB=(Color '326353')
  $slide.Shapes.Item($entry[3]).TextFrame.TextRange.Font.Color.RGB=(Color '0D2634')
 }
 $beats=@{
  2=@(@(7),@(8,9,10,11,12,13,14,15,16,17,18,19),@(20,21,22))
  3=@(@(7,8,9,10,11,12,13,14,15),@(16,17,18))
  4=@(@(7,8),@(9),@(10,11,12))
  5=@(@(7,8),@(9,10),@(11,12),@(13,14))
  6=@(@(7),@(8,9,10,11,12,13,14,15,16))
  7=@(@(7,8,9,10,11,12,13,14,15,16,17,18),@(19,20,21))
  8=@(@(7,8,9,10,11,12),@(13,14,15,16,17,18),@(19))
 }
 foreach($index in 2..8) {
  Write-Host "Animating slide $index"
  $slide=$p.Slides.Item($index)
  foreach($beat in $beats[$index]){Beat $slide $beat}
 }
 Write-Host "Saving deck"
 $p.SaveAs($dest,24)
 Write-Host "Saved"
}
finally {$p.Saved=-1; $p.Close()}
$out=$app.Presentations.Open($dest,-1,0,0)
try {
 $folder=(New-Item -ItemType Directory -Force tmp/ppt-polish/after).FullName
 $out.Export($folder,'PNG',1200,675)
 foreach($slide in $out.Slides) {
  "Slide $($slide.SlideIndex) effects=$($slide.TimeLine.MainSequence.Count) notes=$($slide.NotesPage.Shapes.Count)"
 }
}
finally {$out.Close()}





