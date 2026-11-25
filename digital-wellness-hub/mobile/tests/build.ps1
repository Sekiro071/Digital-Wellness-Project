$ErrorActionPreference = 'Stop'
$mobile = Split-Path $PSScriptRoot
$sdk = Join-Path $mobile 'toolchain\sdk'
$bt = Join-Path $sdk 'build-tools\35.0.0'
$android = Join-Path $sdk 'platforms\android-36\android.jar'
$jdk = 'C:\Program Files\Java\jdk-24\bin'
$env:JAVA_HOME = Split-Path $jdk
$env:PATH = "$jdk;$env:PATH"
$build = Join-Path $PSScriptRoot 'build'
New-Item -Force -ItemType Directory $build, "$build\classes", "$build\dex" | Out-Null
& "$bt\aapt2.exe" link -I $android --manifest "$PSScriptRoot\AndroidManifest.xml" --min-sdk-version 24 --target-sdk-version 35 -o "$build\base.apk"
if ($LASTEXITCODE) { throw 'Test manifest link failed' }
$sources = Get-ChildItem "$PSScriptRoot\src" -Recurse -Filter '*.java' | ForEach-Object FullName
& "$jdk\javac.exe" --release 8 -classpath $android -d "$build\classes" $sources
if ($LASTEXITCODE) { throw 'Test compilation failed' }
$classes = Get-ChildItem "$build\classes" -Recurse -Filter '*.class' | ForEach-Object FullName
& "$bt\d8.bat" --min-api 24 --lib $android --output "$build\dex" $classes
if ($LASTEXITCODE) { throw 'Test DEX failed' }
python -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1], 'a'); z.write(sys.argv[2], 'classes.dex', compress_type=zipfile.ZIP_STORED); z.close()" "$build\base.apk" "$build\dex\classes.dex"
if ($LASTEXITCODE) { throw 'Test assembly failed' }
& "$bt\zipalign.exe" -f -p 4 "$build\base.apk" "$build\aligned.apk"
if ($LASTEXITCODE) { throw 'Test alignment failed' }
$key = Join-Path $mobile 'toolchain\good-signal-signing.jks'
$passfile = Join-Path $mobile 'toolchain\signing-password.txt'
if (!(Test-Path $key) -or !(Test-Path $passfile)) { throw 'Existing signing identity missing' }
try {
  $env:GOOD_SIGNAL_TEST_KEY_PASSWORD = Get-Content -Raw $passfile
  & "$bt\apksigner.bat" sign --ks $key --ks-key-alias good-signal --ks-pass env:GOOD_SIGNAL_TEST_KEY_PASSWORD --key-pass env:GOOD_SIGNAL_TEST_KEY_PASSWORD --out "$build\harness.apk" "$build\aligned.apk"
  if ($LASTEXITCODE) { throw 'Test signing failed' }
} finally { Remove-Item Env:GOOD_SIGNAL_TEST_KEY_PASSWORD -ErrorAction SilentlyContinue }
