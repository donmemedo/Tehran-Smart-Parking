FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    FORWARDED_ALLOW_IPS=127.0.0.1
COPY requirements.txt .
RUN pip install -r requirements.txt \
 && useradd --system --uid 10001 --no-create-home app
COPY app ./app
USER app
EXPOSE 8000
# --proxy-headers: rate limits key on the real client address. Forwarded headers are trusted
#   only from FORWARDED_ALLOW_IPS (default: loopback). docker-compose sets it to the fixed
#   subnet of the private network, so only the frontend proxy can speak for a client.
#   Never set it to "*": any peer could then forge its address and dodge the limits.
# --ws-max-size: the live feed is server-push only, inbound frames are tiny or absent.
# --limit-concurrency: shed load with 503 instead of running out of memory.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", \
     "--ws-max-size", "4096", "--limit-concurrency", "1000", \
     "--timeout-keep-alive", "5", "--no-server-header"]
