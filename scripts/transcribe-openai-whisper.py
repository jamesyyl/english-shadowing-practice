import argparse
import json
from pathlib import Path

import whisper


def main() -> None:
    parser = argparse.ArgumentParser(description="Transcribe an audio file with openai-whisper.")
    parser.add_argument("--audio", required=True, help="Path to the source audio file.")
    parser.add_argument("--output", required=True, help="Path to write Whisper JSON.")
    parser.add_argument("--model", default="tiny.en", help="Whisper model name.")
    parser.add_argument("--language", default="en", help="Language code.")
    args = parser.parse_args()

    audio_path = Path(args.audio)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    model = whisper.load_model(args.model)
    result = model.transcribe(str(audio_path), language=args.language, verbose=False)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "model": args.model,
                "audio": str(audio_path),
                "output": str(output_path),
                "textChars": len(result.get("text", "")),
                "segments": len(result.get("segments", [])),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
