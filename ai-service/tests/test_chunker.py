import unittest

from app.services.chunker import chunk_text


SAMPLE_TEXT = """2. Dang ky hoc va to chuc mo lop
a. Dieu kien mo lop:
• Hoc phan ly thuyet: Toi thieu 25 sinh vien dang ky.
• Hoc phan thuc hanh, thi nghiem, thuc tap: Tuy theo dac thu cua tung hoc phan.
• Hoc phan PBL: Khong to chuc trong hoc ky He.
b. Dang ky chinh thuc:
Sinh vien dang ky theo thong bao cua nha truong.
"""


class ChunkTextTests(unittest.TestCase):
    def test_returns_no_empty_chunks(self):
        self.assertEqual(chunk_text(" \n\n "), [])

    def test_rejects_invalid_sizes(self):
        with self.assertRaises(ValueError):
            chunk_text("text", chunk_size=0)
        with self.assertRaises(ValueError):
            chunk_text("text", chunk_size=100, overlap=-1)
        with self.assertRaises(ValueError):
            chunk_text("text", chunk_size=100, overlap=100)

    def test_keeps_related_list_lines_together_when_they_fit(self):
        chunks = chunk_text(SAMPLE_TEXT, chunk_size=300, overlap=80)

        self.assertTrue(
            any(
                "• Hoc phan ly thuyet" in chunk
                and "• Hoc phan thuc hanh" in chunk
                and "• Hoc phan PBL" in chunk
                for chunk in chunks
            )
        )

    def test_does_not_start_sample_chunk_in_the_middle_of_bullet_tail(self):
        chunks = chunk_text(SAMPLE_TEXT, chunk_size=220, overlap=70)

        self.assertFalse(any(chunk.startswith("hanh, thi nghiem") for chunk in chunks))


if __name__ == "__main__":
    unittest.main()
