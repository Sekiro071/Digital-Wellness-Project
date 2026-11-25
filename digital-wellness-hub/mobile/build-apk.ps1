$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$sdk = Join-Path $root 'toolchain\sdk'
$bt = Join-Path $sdk 'build-tools\35.0.0'
$jdk = 'C:\Program Files\Java\jdk-24\bin'
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-24'
$env:PATH = $jdk + ';' + $env:PATH
$android = Join-Path $sdk 'platforms\android-36\android.jar'
$build = Join-Path $root 'build-direct'
New-Item -Force -ItemType Directory $build, "$build\classes", "$build\res", "$build\dex" | Out-Null
if (-not (Test-Path "$root\app\src\main\assets\www\index.html") -or -not (Test-Path "$root\app\src\main\assets\www\mobile-route-manifest.json")) { throw 'Web assets are not ready: index or route manifest is missing' }
& "$bt\aapt2.exe" compile --dir "$root\app\src\main\res" -o "$build\res.zip"
if ($LASTEXITCODE) { throw 'Resource compilation failed' }
& "$bt\aapt2.exe" link -I $android --manifest "$root\app\src\main\AndroidManifest.xml" --min-sdk-version 24 --target-sdk-version 35 --version-code 8 --version-name 2.2 -o "$build\unsigned-res.apk" "$build\res.zip"
if ($LASTEXITCODE) { throw 'Resource linking failed' }
$sources = Get-ChildItem "$root\app\src\main\java" -Recurse -Filter '*.java' | ForEach-Object FullName
if (-not $sources) { throw 'No Java sources found' }
Get-ChildItem "$build\classes" -Recurse -Filter '*.class' | Remove-Item -Force
& "$jdk\javac.exe" --release 8 -encoding UTF-8 -classpath $android -d "$build\classes" $sources
if ($LASTEXITCODE) { throw 'Java compilation failed' }
$classes = Get-ChildItem "$build\classes" -Recurse -Filter '*.class' | ForEach-Object FullName
& "$bt\d8.bat" --min-api 24 --lib $android --output "$build\dex" $classes
if ($LASTEXITCODE) { throw 'DEX compilation failed' }

$packageScript = @'
import sys, zipfile
from pathlib import Path
with zipfile.ZipFile(sys.argv[4], "r") as source, zipfile.ZipFile(sys.argv[1], "w") as apk:
    for entry in source.infolist():
        apk.writestr(entry.orig_filename.replace("\\", "/"), source.read(entry), compress_type=entry.compress_type)
    apk.write(sys.argv[2], "classes.dex", compress_type=zipfile.ZIP_STORED)
    root = Path(sys.argv[3])
    for path in root.rglob("*"):
        if path.is_file() and not any(part.startswith(".") for part in path.relative_to(root).parts):
            apk.write(path, "assets/" + path.relative_to(root).as_posix(), compress_type=zipfile.ZIP_DEFLATED)
with zipfile.ZipFile(sys.argv[1], "r") as check:
    assert all(chr(92) not in item.orig_filename for item in check.infolist())
'@
& python -c $packageScript "$build\unsigned.apk" "$build\dex\classes.dex" "$root\app\src\main\assets" "$build\unsigned-res.apk"
if ($LASTEXITCODE) { throw 'APK assembly failed' }
& "$bt\zipalign.exe" -f -p 4 "$build\unsigned.apk" "$build\aligned.apk"
if ($LASTEXITCODE) { throw 'Alignment failed' }
$key = Join-Path $root 'toolchain\good-signal-signing.jks'
$passfile = Join-Path $root 'toolchain\signing-password.txt'
if (-not (Test-Path $key) -or -not (Test-Path $passfile)) { throw 'Existing signing key or password missing; refusing to create a different update identity' }
$out = Join-Path (Split-Path $root) 'output\Good_Signal.apk'
New-Item -Force -ItemType Directory (Split-Path $out) | Out-Null
$env:GOOD_SIGNAL_KEY_PASSWORD = Get-Content -Raw $passfile; & "$bt\apksigner.bat" sign --ks $key --ks-key-alias good-signal --ks-pass env:GOOD_SIGNAL_KEY_PASSWORD --key-pass env:GOOD_SIGNAL_KEY_PASSWORD --out $out "$build\aligned.apk"; Remove-Item Env:GOOD_SIGNAL_KEY_PASSWORD
if ($LASTEXITCODE) { throw 'APK signing failed' }
& "$bt\apksigner.bat" verify --verbose --print-certs $out
if ($LASTEXITCODE) { throw 'APK signature verification failed' }
& "$bt\aapt.exe" dump badging $out











