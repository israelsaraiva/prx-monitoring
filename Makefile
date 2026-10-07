# Makefile for prx-monitoring (MACC Monitoring Tool)
#
# Lets you install, build, and run the app from a plain terminal — no VS Code
# or IDE needed.
#
# ---------------------------------------------------------------------------
# Windows setup (one-time):
#   `make` is not bundled with Windows. Pick ONE of the following:
#     1. Git Bash / MSYS2:  install "make" via `pacman -S make` (MSYS2) or use
#        the "Git for Windows SDK", which ships with a `make` binary.
#     2. Chocolatey:        choco install make
#     3. WSL:               wsl --install, then run `make` inside the Linux shell.
#   After that, run commands from PowerShell, cmd.exe (with make on PATH),
#   Git Bash, or WSL — all work the same way, e.g.:
#     make install
#     make build
#     make start
# ---------------------------------------------------------------------------

PM ?= pnpm
PORT ?= 3000

.PHONY: help install dev build start run lint format format-check clean \
        kafka-up kafka-down kafka-logs kafka-status kafka-produce graphql-test

help:
	@echo "Available targets:"
	@echo "  make install         Install dependencies"
	@echo "  make dev             Start the development server (http://localhost:$(PORT))"
	@echo "  make build           Build the production bundle"
	@echo "  make start           Start the already-built app (run 'make build' first)"
	@echo "  make run             Build then start the app in one step"
	@echo "  make lint            Run ESLint"
	@echo "  make format          Format code with Prettier (writes changes)"
	@echo "  make format-check    Check formatting without writing"
	@echo "  make clean           Remove build output (.next) so the next build is fresh"
	@echo "  make kafka-up        Start local Kafka stack (Zookeeper + Kafka + Kafka UI)"
	@echo "  make kafka-down      Stop local Kafka stack"
	@echo "  make kafka-logs      Tail Kafka logs"
	@echo "  make kafka-status    Show Kafka service status"
	@echo "  make kafka-produce   Publish test messages to local Kafka"
	@echo "  make graphql-test    Start the test GraphQL/WebSocket server (port 4000)"
	@echo ""
	@echo "Override the package manager or port if needed, e.g.:"
	@echo "  make PM=npm install"
	@echo "  make PORT=4000 dev"

install:
	$(PM) install

dev:
	$(PM) dev

build:
	$(PM) build

start:
	PORT=$(PORT) $(PM) start

run: build start

lint:
	$(PM) lint

format:
	$(PM) format

format-check:
	$(PM) format:check

clean:
	rm -rf .next

kafka-up:
	$(PM) kafka:up

kafka-down:
	$(PM) kafka:down

kafka-logs:
	$(PM) kafka:logs

kafka-status:
	$(PM) kafka:status

kafka-produce:
	$(PM) kafka:produce

graphql-test:
	$(PM) graphql:test
