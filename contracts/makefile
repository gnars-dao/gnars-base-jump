# Makefile

# Default target if none is specified
all: deploy

# Load environment variables from .env file
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# Deploy and verify contract
deploy:
	@forge script MyScript --rpc-url $$SEPOLIA_RPC_URL --broadcast

.PHONY: all deploy
