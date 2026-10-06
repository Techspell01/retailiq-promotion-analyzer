import os

import uvicorn

from mock_source_api.generator import dataset
from mock_source_api.server import app

if __name__ == "__main__":
    dataset()  # build the data before accepting requests
    host = os.getenv("SOURCE_API_HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=int(os.getenv("SOURCE_API_PORT", "3000")), log_level="warning")
