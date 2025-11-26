# Ario AI Llama 3.1 8B SFT

This folder contains everything needed to fine-tune the core Ario AI assistant (`meta-llama/Meta-Llama-3.1-8B-Instruct`) with Axolotl using QLoRA. Datasets are expected to be produced by a separate repo (e.g., `ario-ai-dataset-builder`) and placed here.

## Dataset layout
- `dataset/train.jsonl`
- `dataset/validation.jsonl`
- `dataset/test.jsonl`

Each JSONL entry should follow a chat schema with a `messages` field containing a list of `{role, content}` pairs.

## Quickstart
1) Place the generated JSONL files under `dataset/`.
2) Install Axolotl and its dependencies in your GPU environment.
3) Run `scripts/run_sft.sh` to launch supervised fine-tuning.
