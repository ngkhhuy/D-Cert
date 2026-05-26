Bạn là AI engineer đang làm trong dự án D-CERT. Hãy chỉnh đúng theo kiến trúc hiện tại, không thiết kế lại toàn bộ hệ thống.

Bối cảnh hệ thống hiện tại:
- Backend Express upload file vào filesystem trước.
- Backend gửi JSON sang FastAPI /ingest, trong đó có file_path tuyệt đối.
- AI service chỉ ingest PDF.
- AI service dùng PyMuPDF để đọc PDF.
- Chunker hiện đã có logic chia đoạn khá tốt.
- Embedding dùng bkai-foundation-models/vietnamese-bi-encoder.
- Vector lưu vào ai-service/app/storage/faiss.index.
- Metadata lưu vào ai-service/app/storage/metadata.json.
- Trong rag_service.py, sau khi tạo normal chunks, hệ thống đã gọi generated chunks bằng rule.
- File generated_chunks.py hiện đã có generated summary cho:
  1. Phân loại điểm rèn luyện
  2. Chuẩn tiếng Anh đầu ra chương trình đại trà
  3. Thời gian tiết học

Vấn đề hiện tại:
Khi hỏi:
"Học bổng loại giỏi cần điều kiện gì?"

AI trả lời sai:
- Nói điểm rèn luyện loại khá trở lên / từ 65 điểm
- Nói mức học bổng loại giỏi bằng 120% học phí hiện hành

Đáp án đúng theo Sổ tay sinh viên:
1. Học bổng loại khá / loại C:
- Điểm trung bình chung học tập: từ 7.00 đến 7.99 theo thang điểm 10.
- Điểm rèn luyện: loại khá trở lên, tức từ 65 điểm trở lên.
- Mức học bổng: bằng 100% mức học phí hiện hành của chương trình đào tạo mà sinh viên phải đóng đối với các học phần học lần đầu trong học kỳ lấy điểm xét học bổng.

2. Học bổng loại giỏi / loại B:
- Điểm trung bình chung học tập: từ 8.00 đến 8.99 theo thang điểm 10.
- Điểm rèn luyện: loại tốt trở lên, tức từ 80 điểm trở lên.
- Mức học bổng: bằng 120% mức học bổng loại khá / loại C.

3. Học bổng loại xuất sắc / loại A:
- Điểm trung bình chung học tập: từ 9.00 trở lên theo thang điểm 10.
- Điểm rèn luyện: loại xuất sắc, tức từ 90 điểm trở lên.
- Mức học bổng: bằng 150% mức học bổng loại khá / loại C.

Yêu cầu sửa:

PHẦN 1: Sửa generated_chunks.py

1. Mở file:
ai-service/app/services/generated_chunks.py

2. Thêm generated summary chunk mới cho phần Học bổng khuyến khích học tập.

3. Nếu full_text của PDF chứa các cụm liên quan như:
- "Học bổng khuyến khích học tập"
- "Học bổng loại khá"
- "Học bổng loại giỏi"
- "Học bổng loại xuất sắc"
hoặc các cụm gần đúng tương ứng, thì tạo thêm generated chunk sau:

HỌC BỔNG KHUYẾN KHÍCH HỌC TẬP:
Học bổng khuyến khích học tập có 3 loại: loại khá / loại C, loại giỏi / loại B và loại xuất sắc / loại A.

1. Học bổng loại khá / loại C:
- Điều kiện điểm học tập: điểm trung bình chung học tập từ 7.00 đến 7.99 theo thang điểm 10.
- Điều kiện điểm rèn luyện: đạt loại khá trở lên, tức từ 65 điểm trở lên.
- Mức học bổng: bằng 100% mức học phí hiện hành của chương trình đào tạo mà sinh viên phải đóng đối với các học phần học lần đầu trong học kỳ lấy điểm xét học bổng.

2. Học bổng loại giỏi / loại B:
- Điều kiện điểm học tập: điểm trung bình chung học tập từ 8.00 đến 8.99 theo thang điểm 10.
- Điều kiện điểm rèn luyện: đạt loại tốt trở lên, tức từ 80 điểm trở lên.
- Mức học bổng: bằng 120% mức học bổng loại khá / loại C.

3. Học bổng loại xuất sắc / loại A:
- Điều kiện điểm học tập: điểm trung bình chung học tập từ 9.00 trở lên theo thang điểm 10.
- Điều kiện điểm rèn luyện: đạt loại xuất sắc, tức từ 90 điểm trở lên.
- Mức học bổng: bằng 150% mức học bổng loại khá / loại C.

4. Metadata của generated chunk phải giữ đúng format hiện tại, gồm:
- document_id
- title
- type
- source_unit
- issued_date
- effective_from
- effective_to
- status
- page
- chunk_index
- content
- is_generated_summary = True

5. Nếu hệ thống đã có field source_strategy thì thêm:
source_strategy = "table_to_text"
Nếu chưa có field này thì có thể thêm, nhưng không được làm hỏng code cũ.

6. page của generated chunk nên đặt là trang chứa phần học bổng nếu detect được. Nếu chưa detect được chính xác thì có thể để page = None hoặc page = trang đầu tiên match keyword, nhưng không được crash.

7. chunk_index của generated chunk phải nối tiếp sau normal chunks, không trùng với chunk gốc.

PHẦN 2: Không sửa sai phạm vi

Không sửa:
- API /ingest
- API /chat
- Backend Express
- Frontend
- Response schema
- Logic upload file_path hiện tại
- Model embedding
- FAISS vector store

Chỉ sửa phần generated summary chunk và các helper liên quan nếu cần.

PHẦN 3: Cải thiện retrieval nếu cần

Nếu trong rag_service.py đã có TOP_K và RETRIEVAL_THRESHOLD thì kiểm tra:
- RETRIEVAL_THRESHOLD nên là 0.30
- TOP_K nên là 12
- FINAL_CONTEXTS nên là 5 nếu có

Nếu chưa có keyword fallback thì chưa bắt buộc làm trong bước này. Ưu tiên sửa generated chunk học bổng trước.

PHẦN 4: Reindex bắt buộc

Sau khi sửa code, cần reindex lại tài liệu Sổ tay sinh viên, vì FAISS và metadata.json hiện vẫn đang chứa chunk cũ.

Có thể reindex bằng:
- Admin UI nút Reindex nếu tài liệu đang PUBLISHED
hoặc
- Gọi lại /ingest với cùng document_id nếu đang test trực tiếp

PHẦN 5: Test lại

Sau khi reindex, test các câu:

1. Học bổng loại giỏi cần điều kiện gì?
Kỳ vọng:
Điểm học tập từ 8.00 đến 8.99, điểm rèn luyện loại tốt trở lên tức từ 80 điểm trở lên, mức học bổng bằng 120% mức học bổng loại khá.

2. Học bổng loại khá cần điều kiện gì?
Kỳ vọng:
Điểm học tập từ 7.00 đến 7.99, điểm rèn luyện loại khá trở lên tức từ 65 điểm trở lên.

3. Học bổng loại xuất sắc cần điều kiện gì?
Kỳ vọng:
Điểm học tập từ 9.00 trở lên, điểm rèn luyện loại xuất sắc tức từ 90 điểm trở lên.

4. Học bổng loại giỏi bằng bao nhiêu so với loại khá?
Kỳ vọng:
Bằng 120% mức học bổng loại khá / loại C.

5. Sinh viên điểm học tập 8.5 và rèn luyện 82 có thể thuộc mức học bổng nào?
Kỳ vọng:
Có thể phù hợp với học bổng loại giỏi nếu đáp ứng các điều kiện khác theo quy định.

Yêu cầu cuối:
- Code rõ ràng, dễ bảo trì.
- Có type hints nếu thêm hàm mới.
- Không dùng LLM để sinh generated chunk.
- Không hardcode sai kiểu "loại giỏi rèn luyện từ 65 điểm".
- Không viết "loại giỏi bằng 120% học phí"; phải viết "120% mức học bổng loại khá".