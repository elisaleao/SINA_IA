from app.services.text_chunks import split_into_chunks


def test_short_text_stays_in_one_chunk():
    assert split_into_chunks('Um parágrafo curto.', 100) == [
        'Um parágrafo curto.'
    ]


def test_paragraphs_are_packed_without_passing_the_limit():
    text = '\n\n'.join(['a' * 40, 'b' * 40, 'c' * 40])

    chunks = split_into_chunks(text, 90)

    assert chunks == ['a' * 40 + '\n\n' + 'b' * 40, 'c' * 40]


def test_long_paragraph_is_split_at_sentences():
    # A dense single paragraph must still fit the provider limit.
    sentence = 'A derivada indica a taxa de variação. '
    text = sentence * 10

    chunks = split_into_chunks(text, 80)

    assert all(len(chunk) <= 80 for chunk in chunks)
    assert ' '.join(chunks).split() == text.split()


def test_text_without_breaks_is_cut_at_the_limit():
    chunks = split_into_chunks('x' * 250, 100)

    assert [len(chunk) for chunk in chunks] == [100, 100, 50]


def test_empty_text_gives_no_chunks():
    assert split_into_chunks('   \n\n  ', 100) == []
