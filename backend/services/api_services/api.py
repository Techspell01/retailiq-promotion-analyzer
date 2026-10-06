import os

# The source-of-truth system the ETL pipeline pulls from. Locally this is the
# mock source API in mock_source_api/ (python -m mock_source_api).
SERVER_URI = os.getenv("SOURCE_API_URL", "http://127.0.0.1:3000/api/v1")

def get_server_uri(route: str) -> str:
     return f"{SERVER_URI.rstrip('/')}/{route.lstrip('/')}"
