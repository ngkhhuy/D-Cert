import unittest

from app.services.generated_chunks import build_generated_chunks


BASE_METADATA = {
    "document_id": "student-handbook",
    "title": "Sổ tay sinh viên",
    "type": "HANDBOOK",
    "source_unit": "Phòng Đào tạo",
    "issued_date": "2026-05-24",
    "effective_from": None,
    "effective_to": None,
    "status": "PUBLISHED",
}


class GeneratedChunksTests(unittest.TestCase):
    def test_builds_training_score_summary_across_pages(self):
        chunks = build_generated_chunks(
            [
                {
                    "page": 3,
                    "text": "MỤC LỤC\n2.3.1. Phân loại kết quả rèn luyện sinh viên",
                },
                {
                    "page": 20,
                    "text": "2.3.1. Phân loại kết quả rèn luyện sinh viên\nXuất sắc\nTốt\nKhá\nTrung bình",
                },
                {
                    "page": 21,
                    "text": "Yếu\nKém",
                },
            ],
            {**BASE_METADATA, "chunk_index_start": 12},
        )

        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["chunk_index"], 12)
        self.assertEqual(chunks[0]["page"], 20)
        self.assertTrue(chunks[0]["is_generated_summary"])
        self.assertIn("Kém: dưới 35 điểm.", chunks[0]["content"])
        self.assertIn("Yếu: từ 35 đến dưới 50 điểm.", chunks[0]["content"])

    def test_builds_english_outcome_summary(self):
        chunks = build_generated_chunks(
            [
                {
                    "page": 33,
                    "text": "Yêu cầu về trình độ tiếng Anh khi tốt nghiệp đối với sinh viên chương trình đại trà",
                },
            ],
            BASE_METADATA,
        )

        self.assertEqual(len(chunks), 1)
        self.assertIn("TOEIC 450", chunks[0]["content"])
        self.assertIn("chương trình đại trà", chunks[0]["content"])

    def test_builds_class_period_summary(self):
        chunks = build_generated_chunks(
            [
                {
                    "page": 7,
                    "text": "MỤC LỤC\nTHỜI GIAN TIẾT HỌC",
                },
                {
                    "page": 5,
                    "text": "THỜI GIAN TIẾT HỌC\nTiết 1\n07h00\n07h50\nTiết 14\n19h55\n20h40",
                },
            ],
            BASE_METADATA,
        )

        self.assertEqual(len(chunks), 1)
        self.assertIn("Tiết 1: 07h00-07h50", chunks[0]["content"])
        self.assertIn("Tiết 12: 18h15-19h00", chunks[0]["content"])
        self.assertIn("Tiết 14: 19h55-20h40", chunks[0]["content"])

    def test_returns_empty_when_no_rule_matches(self):
        chunks = build_generated_chunks(
            [{"page": 1, "text": "Thông tin chung của tài liệu"}],
            BASE_METADATA,
        )

        self.assertEqual(chunks, [])


if __name__ == "__main__":
    unittest.main()
