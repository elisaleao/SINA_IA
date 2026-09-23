import pytest

from tests.e2e.polling import wait_until


async def test_wait_until_returns_once_the_state_is_final():
    states = iter([{'status': 'enviado'}, {'status': 'processando'}])
    last = {'status': 'pronto'}

    async def fetch():
        return next(states, last)

    result = await wait_until(
        fetch, lambda s: s['status'] == 'pronto', first_delay=0.001
    )

    assert result == last


async def test_wait_until_gives_up_after_the_timeout():
    async def fetch():
        return {'status': 'processando'}

    with pytest.raises(TimeoutError, match='processando'):
        await wait_until(
            fetch, lambda s: False, timeout=0.05, first_delay=0.01
        )
