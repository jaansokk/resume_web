FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (minimal) for uvicorn[standard]
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app

EXPOSE 8000

# SECURITY: Trust proxy headers ONLY from allowed upstream IPs.
# - --proxy-headers: enables X-Forwarded-For / Forwarded parsing.
# - --forwarded-allow-ips: restricts which *connecting* IPs are trusted to supply those headers.
#   In Docker, the reverse proxy typically connects from a private bridge subnet (often 172.16.0.0/12).
#   Override via FORWARDED_ALLOW_IPS in compose/.env if you want to tighten it further.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info --proxy-headers --forwarded-allow-ips \"${FORWARDED_ALLOW_IPS:-10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1,::1}\""]


