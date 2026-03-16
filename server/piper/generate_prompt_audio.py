from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate interviewer prompt audio files from a JSON question list using Piper.",
    )
    parser.add_argument(
        "--questions",
        required=True,
        help="Path to a JSON file with items like {\"id\": \"q1\", \"text\": \"...\"}.",
    )
    parser.add_argument("--model", required=True, help="Path to the Piper .onnx model.")
    parser.add_argument("--config", help="Path to the Piper .onnx.json config file.")
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory where generated .wav files will be written.",
    )
    parser.add_argument(
        "--piper-cmd",
        default="piper",
        help="Piper executable or command name. Default: piper",
    )
    parser.add_argument(
        "--ffmpeg-cmd",
        default="ffmpeg",
        help="ffmpeg executable or command name. Used only when --format mp3. Default: ffmpeg",
    )
    parser.add_argument(
        "--format",
        choices=("wav", "mp3"),
        default="wav",
        help="Output format. Piper writes WAV natively; MP3 requires ffmpeg. Default: wav",
    )
    parser.add_argument(
        "--sentence-silence",
        type=float,
        default=0.15,
        help="Seconds of silence after each sentence. Default: 0.15",
    )
    parser.add_argument(
        "--length-scale",
        type=float,
        help="Optional Piper length scale to slow down or speed up speech.",
    )
    parser.add_argument(
        "--noise-scale",
        type=float,
        help="Optional Piper noise scale.",
    )
    parser.add_argument(
        "--noise-w-scale",
        type=float,
        help="Optional Piper phoneme width noise scale.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing files.",
    )
    return parser.parse_args()


def load_questions(path: Path) -> list[dict[str, str]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Question file must contain a JSON array.")

    normalized: list[dict[str, str]] = []
    for item in data:
        if not isinstance(item, dict):
            raise ValueError("Every question item must be an object.")
        question_id = str(item.get("id", "")).strip()
        question_text = str(item.get("text", "")).strip()
        if not question_id or not question_text:
            raise ValueError("Every question item must have non-empty 'id' and 'text'.")
        normalized.append({"id": question_id, "text": question_text})
    return normalized


def ensure_command_exists(command_name: str) -> None:
    if shutil.which(command_name) is None:
        raise FileNotFoundError(f"Command not found in PATH: {command_name}")


def resolve_ffmpeg_command(command_name: str) -> str:
    found = shutil.which(command_name)
    if found:
        return found

    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as error:
        raise FileNotFoundError(
            f"ffmpeg tidak ditemukan di PATH dan fallback imageio-ffmpeg juga belum tersedia: {command_name}"
        ) from error


def run_piper(
    *,
    command_name: str,
    model_path: Path,
    config_path: Path | None,
    output_path: Path,
    question_text: str,
    sentence_silence: float,
    length_scale: float | None,
    noise_scale: float | None,
    noise_w_scale: float | None,
) -> None:
    command = [
        command_name,
        "--model",
        str(model_path),
        "--output_file",
        str(output_path),
        "--sentence_silence",
        str(sentence_silence),
    ]
    if config_path:
        command.extend(["--config", str(config_path)])
    if length_scale is not None:
        command.extend(["--length_scale", str(length_scale)])
    if noise_scale is not None:
        command.extend(["--noise_scale", str(noise_scale)])
    if noise_w_scale is not None:
        command.extend(["--noise_w_scale", str(noise_w_scale)])

    result = subprocess.run(
        command,
        input=question_text,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Piper failed for '{output_path.name}'.\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )


def convert_wav_to_mp3(ffmpeg_cmd: str, wav_path: Path, mp3_path: Path) -> None:
    result = subprocess.run(
        [
            ffmpeg_cmd,
            "-y",
            "-i",
            str(wav_path),
            "-codec:a",
            "libmp3lame",
            "-q:a",
            "2",
            str(mp3_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed for '{wav_path.name}'.\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )


def main() -> int:
    args = parse_args()
    questions_path = Path(args.questions).resolve()
    model_path = Path(args.model).resolve()
    config_path = Path(args.config).resolve() if args.config else None
    output_dir = Path(args.output_dir).resolve()

    if not questions_path.exists():
        raise FileNotFoundError(f"Question file not found: {questions_path}")
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")
    if config_path and not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    ensure_command_exists(args.piper_cmd)
    ffmpeg_cmd = args.ffmpeg_cmd
    if args.format == "mp3":
        ffmpeg_cmd = resolve_ffmpeg_command(args.ffmpeg_cmd)

    questions = load_questions(questions_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    for question in questions:
        wav_path = output_dir / f"{question['id']}.wav"
        final_path = output_dir / f"{question['id']}.{args.format}"

        if final_path.exists() and not args.overwrite:
            print(f"skip {final_path.name} (already exists)")
            continue

        run_piper(
            command_name=args.piper_cmd,
            model_path=model_path,
            config_path=config_path,
            output_path=wav_path,
            question_text=question["text"],
            sentence_silence=args.sentence_silence,
            length_scale=args.length_scale,
            noise_scale=args.noise_scale,
            noise_w_scale=args.noise_w_scale,
        )

        if args.format == "mp3":
            convert_wav_to_mp3(ffmpeg_cmd, wav_path, final_path)
            wav_path.unlink(missing_ok=True)
        else:
            final_path = wav_path

        print(f"generated {final_path.name}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
