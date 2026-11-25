param($folder,$out)
Add-Type -AssemblyName System.Drawing
$im=[Drawing.Bitmap]::new(1200,1350)
$g=[Drawing.Graphics]::FromImage($im)
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
for($i=0;$i -lt 8;$i++){
 $page=[Drawing.Image]::FromFile((Resolve-Path "$folder/Slide$($i+1).PNG").Path)
 $g.DrawImage($page,($i%2)*600,[int][math]::Floor($i/2)*337,600,337)
 $page.Dispose()
}
$im.Save($out,[Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$im.Dispose()
