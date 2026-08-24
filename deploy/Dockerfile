# The public demo image.
#
# It runs the console and the ledger and nothing else. The six A2A servers are
# not started here: with BARNRAISE_DEMO=1 no round can begin, so they would be six
# idle processes holding memory and widening the surface for nothing.
FROM python:3.12-slim

# Dependencies first, so a change to the application does not reinstall them.
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agents/ agents/
COPY ledger/ ledger/
COPY seed/ seed/
COPY web/ web/

# The ledger is the only thing that is written, and it lives on a volume. The
# rest of the tree belongs to root and the process cannot modify it.
RUN useradd --system --uid 10001 barnraise \
 && mkdir -p /data \
 && chown barnraise:barnraise /data
USER barnraise

ENV BARNRAISE_DEMO=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8080
CMD ["python", "web/server.py"]
