# Build stage
FROM rust:1.88-bookworm AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Aptos CLI
RUN curl -fsSL "https://aptos.dev/scripts/install_cli.sh" | bash
ENV PATH="/root/.local/bin:${PATH}"

# Pre-fetch Aptos Framework to speed up first compile
RUN mkdir -p /opt/aptos-framework && \
    git clone --depth 1 --branch mainnet \
    https://github.com/aptos-labs/aptos-core.git /tmp/aptos && \
    mv /tmp/aptos/aptos-move/framework /opt/aptos-framework && \
    rm -rf /tmp/aptos

# Copy built binary
COPY --from=builder /app/target/release/playground-backend /usr/local/bin/

# Environment
ENV PLAYGROUND_HOST=0.0.0.0
ENV PLAYGROUND_PORT=8080
ENV APTOS_CLI_PATH=/root/.local/bin/aptos

EXPOSE 8080

CMD ["playground-backend"]
