import asyncio
import time
from typing import Any, Awaitable, Callable

FINAL_STATUSES = frozenset({'pronto', 'erro'})


async def wait_until(
    fetch: Callable[[], Awaitable[dict[str, Any]]],
    done: Callable[[dict[str, Any]], bool],
    *,
    timeout: float = 30.0,
    first_delay: float = 0.05,
    max_delay: float = 2.0,
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    delay = first_delay
    while True:
        current = await fetch()
        if done(current):
            return current
        if time.monotonic() + delay > deadline:
            raise TimeoutError(
                f'Estado final não alcançado em {timeout}s: {current}'
            )
        await asyncio.sleep(delay)
        delay = min(delay * 2, max_delay)


async def wait_for_material(
    client, headers: dict, material_id: str, *, timeout: float = 30.0
) -> dict[str, Any]:
    async def fetch() -> dict[str, Any]:
        response = await client.get(
            f'/api/materiais/{material_id}', headers=headers
        )
        assert response.status_code == 200, response.text
        return response.json()

    return await wait_until(
        fetch, lambda m: m['status'] in FINAL_STATUSES, timeout=timeout
    )
