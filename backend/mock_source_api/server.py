"""Mock source-of-truth API.

Stands in for the client's retail data system that the ETL pipeline
(`services/pipeline_services`) pulls from. It serves the response shapes
defined in `services/api_services/model.py`:

    GET /api/v1/products | skus | customers | promotions | bundles
        -> {status, message, data}
    GET /api/v1/fulfillment-history?page= | sales?page=
        -> {status, message, page, max_page, data}
"""

from __future__ import annotations

import math

from fastapi import APIRouter, FastAPI

from mock_source_api.generator import dataset

PAGE_SIZE = 2000

router = APIRouter(prefix="/api/v1")


def _ok(data: list) -> dict:
    return {"status": 200, "message": "success", "data": data}


def _paged(rows: list, page: int) -> dict:
    max_page = max(1, math.ceil(len(rows) / PAGE_SIZE))
    page = min(max(page, 1), max_page)
    start = (page - 1) * PAGE_SIZE
    return {
        "status": 200,
        "message": "success",
        "page": page,
        "max_page": max_page,
        "data": rows[start:start + PAGE_SIZE],
    }


@router.get("/products")
def products():
    return _ok(dataset().products)


@router.get("/skus")
def skus():
    return _ok(dataset().skus)


@router.get("/customers")
def customers():
    return _ok(dataset().customers)


@router.get("/promotions")
def promotions():
    return _ok(dataset().promotions)


@router.get("/bundles")
def bundles():
    return _ok([])


@router.get("/fulfillment-history")
def fulfillment_history(page: int = 1):
    return _paged(dataset().fulfillment_history, page)


@router.get("/sales")
def sales(page: int = 1):
    return _paged(dataset().sales, page)


app = FastAPI(title="RetailIQ mock source system")
app.include_router(router)


@app.get("/")
def health():
    ds = dataset()
    return {
        "service": "mock source-of-truth API",
        "products": len(ds.products),
        "skus": len(ds.skus),
        "customers": len(ds.customers),
        "promotions": len(ds.promotions),
        "fulfillment_history": len(ds.fulfillment_history),
        "sales": len(ds.sales),
    }
