#!/usr/bin/env bash
# Run inside a new or existing Morrow workspace.
# Idempotent: does not truncate an existing decision log or task register.
set -euo pipefail

mkdir -p .github/workflows 00-CORE 01-PROJECTS 02-KNOWLEDGE 03-WORKING_STATE \
  04-DECISIONS 05-RESEARCH 06-SOURCES 07-ARCHIVE
if [[ ! -e 04-DECISIONS/DECISION_LOG.md ]]; then
  printf '# Decision Log\n' > 04-DECISIONS/DECISION_LOG.md
fi
if [[ ! -e 03-WORKING_STATE/TASK_REGISTER.md ]]; then
  printf '# Task Register\n' > 03-WORKING_STATE/TASK_REGISTER.md
fi
echo "Morrow directory layout present; existing records preserved."
