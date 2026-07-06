# ASR Setup Notes

## Current Status

Python ASR packages are installed and importable in the current Windows Python 3.11 environment:

- `openai-whisper`
- `faster-whisper`
- `vosk`

The remaining blocker is model file download, not Python package installation.

Update 2026-07-06: after switching Clash node / HTTPS egress, `openai-whisper tiny.en` model download succeeded and the proof-of-concept sample was transcribed.

Generated files:

```text
samples/asr/bedtime-old-woman-shoe.whisper.json
data/episodes/bedtime-old-woman-shoe/asr/whisper.json
data/episodes/bedtime-old-woman-shoe/episode.json
```

Result:

```text
segments: 109
episode status: transcribed
```

Standard `openai-whisper` output provides segment-level timestamps. Word-level timestamps remain a later enhancement via `faster-whisper` or forced alignment.

## What Worked

The default proxy environment points to Clash / Mihomo:

```text
HTTP_PROXY=http://127.0.0.1:7897
HTTPS_PROXY=http://127.0.0.1:7897
```

That proxy port is open, but HTTPS requests through it can establish `CONNECT` and then fail during TLS handshake.

Package installation works when bypassing the proxy and using Tencent PyPI mirror:

```powershell
$env:HTTP_PROXY=''
$env:HTTPS_PROXY=''
$env:http_proxy=''
$env:https_proxy=''
$env:ALL_PROXY=''
$env:all_proxy=''

python -m pip install openai-whisper -i https://mirrors.cloud.tencent.com/pypi/simple/ --trusted-host mirrors.cloud.tencent.com
python -m pip install faster-whisper -i https://mirrors.cloud.tencent.com/pypi/simple/ --trusted-host mirrors.cloud.tencent.com
python -m pip install vosk -i https://mirrors.cloud.tencent.com/pypi/simple/ --trusted-host mirrors.cloud.tencent.com
```

## What Failed

`openai-whisper` package installed, but its model download failed:

```text
https://openaipublic.azureedge.net/main/whisper/models/.../tiny.en.pt
```

Error pattern:

```text
SSL: UNEXPECTED_EOF_WHILE_READING
```

`faster-whisper` package installed, but Hugging Face model download failed with the same TLS EOF pattern.

`vosk` package installed, and the model URL responds to HEAD:

```text
https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
```

But the 41 MB model zip download stalled / timed out on this network.

## Likely Cause

The root cause is the current HTTPS egress path, likely Clash node / Clash mode / local proxy behavior. Evidence:

- `127.0.0.1:7897` is listening.
- `curl` through `127.0.0.1:7897` receives `HTTP/1.1 200 Connection established`.
- TLS handshake then fails for PyPI, GitHub, Google, AzureEdge, and some model hosts.
- Python packages can be installed only by bypassing the proxy and using a reachable mirror.

## Retry After Switching Clash Node

After switching to a node that can handle HTTPS downloads reliably, retry the smallest model first:

```powershell
$env:PYTHONIOENCODING='utf-8'
python -c "import whisper; model=whisper.load_model('tiny.en'); print('loaded openai-whisper tiny.en')"
```

Transcribe the current sample:

```powershell
python scripts/transcribe-openai-whisper.py --audio "samples/bedtimestories_06_anonymous_128kb.mp3" --output "samples/asr/bedtime-old-woman-shoe.whisper.json" --model tiny.en
node scripts/import-whisper-json.js --episodeId bedtime-old-woman-shoe --input "samples/asr/bedtime-old-woman-shoe.whisper.json"
```

If that still fails, retry Vosk model download:

```powershell
$url='https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip'
$out='D:\GitHub\english-shadowing-practice\models\vosk-model-small-en-us-0.15.zip'
New-Item -ItemType Directory -Force -Path 'D:\GitHub\english-shadowing-practice\models' | Out-Null
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing -TimeoutSec 600
```

## Preferred Route

For product quality, prefer Whisper / faster-whisper once model download works.

For proof of concept, Vosk is acceptable because it can run locally and produce word-level timings, but transcription quality may be lower.
