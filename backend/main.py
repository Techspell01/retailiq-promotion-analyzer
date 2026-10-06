import logging
import os
from pathlib import Path

from dotenv import load_dotenv


class _IgnoreConnectionReset(logging.Filter):
    """Windows' asyncio logs a harmless traceback whenever a browser drops a
    connection (WinError 10054); keep it out of the console."""

    def filter(self, record: logging.LogRecord) -> bool:
        return not (record.exc_info and isinstance(record.exc_info[1], ConnectionResetError))


logging.getLogger("asyncio").addFilter(_IgnoreConnectionReset())

# Relative paths (retailiq.db, documents/, .qdrant/) are relative to backend/.
os.chdir(Path(__file__).resolve().parent)

# Must run before the imports below: session.py and the agent read their
# settings from the environment at import time.
load_dotenv()

import uvicorn

from api.api import get_app
from bootstrap import bootstrap


def main():

    # Creates tables and the demo user, loads data on first run, and indexes
    # documents/sales_guidebook.md and documents/promotion_profiles.pdf.
    bootstrap()
    app = get_app()

    uvicorn.run(app, host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "8000")))


if __name__ == "__main__":
    main()
