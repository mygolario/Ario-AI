#!/usr/bin/env bash
set -e

CONFIG_PATH="config/ario-llama3.1-8b-sft.yaml"

echo "Starting SFT for Ario AI Llama 3.1 8B with Axolotl..."
python -m axolotl.cli.train "${CONFIG_PATH}"
