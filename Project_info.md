# D-CERT - He thong quan ly, so hoa va xac thuc van bang bang Blockchain

## 1. Tong quan du an

D-CERT la he thong web phuc vu quan ly, phat hanh va xac thuc van bang/chung chi trong moi truong giao duc dai hoc. Du an duoc xay dung cho do an tot nghiep chuyen nganh He thong Thong tin, tap trung vao bai toan chong gia mao van bang, so hoa quy trinh cap phat va ho tro nguoi dung ben ngoai xac minh tinh toan ven cua tai lieu.

Y tuong cot loi cua he thong la: file PDF van bang sau khi duoc ky duyet se duoc bam SHA-256, sau do ma bam nay duoc ghi len smart contract tren Ethereum Sepolia. Khi can xac thuc, he thong bam lai file PDF nguoi dung upload va doi chieu voi du lieu da luu trong MongoDB va trang thai on-chain. Neu file bi sua du chi mot byte, hash se thay doi va viec xac thuc se that bai.

Du an duoc chia thanh 3 lop:

- Web2 Core: backend Express.js, frontend React, MongoDB, JWT, RBAC.
- Web3 Trust Layer: Solidity smart contract, Ethereum Sepolia, ethers.js, IPFS/Pinata tuy cau hinh.
- AI Layer: du kien cho giai doan 3, gom OCR/NER va chatbot RAG, hien chua uu tien.

Trong pham vi hien tai, du an tap trung hoan thien giai doan 1 va 2: nghiep vu quan ly van bang, phat hanh PDF, QR verify, hash SHA-256, ghi/kiem tra blockchain, IPFS va giao dien admin/student/public verifier.

## 2. Muc tieu nghiep vu

He thong nham giai quyet cac van de sau:

- So hoa quy trinh tao ban nhap, ky duyet va phat hanh van bang.
- Giam rui ro gia mao bang cap bang cach luu dau van tay so cua file PDF len blockchain.
- Cho phep sinh vien truy cap va tai van bang da phat hanh.
- Cho phep nha tuyen dung/ben thu ba xac thuc van bang ma khong can tai khoan noi bo.
- Luu vet giao dich phat hanh/thu hoi bang `txHash` tren Sepolia.
- Ho tro mo rong sang IPFS de luu ban PDF phan tan.

## 3. Kien truc tong the

Thu muc du an gom 3 phan chinh:

```text
D-Cert/
├── backend/      # Node.js + Express + MongoDB + ethers.js
├── frontend/     # React + Vite + TailwindCSS
├── blockchain/   # Hardhat + Solidity smart contract
├── Project.md
└── Project_info.md
```

### 3.1 Backend

Backend nam trong `backend/`, su dung:

- Node.js, Express.js.
- MongoDB thong qua Mongoose.
- JWT de xac thuc.
- bcryptjs de bam mat khau.
- multer de upload PDF/CSV.
- pdf-lib va qrcode de sinh/chen QR vao PDF.
- ethers.js de goi smart contract.
- Pinata/IPFS thong qua service rieng, bat khi co token cau hinh.

Backend ap dung cau truc 3 lop:

- `routes/`: dinh nghia API endpoint.
- `controllers/`: xu ly nghiep vu.
- `services/`: tich hop blockchain/IPFS.
- `models/`: schema MongoDB.
- `utils/`: hash file, tao short code, sinh PDF.

### 3.2 Frontend

Frontend nam trong `frontend/`, su dung:

- React 19.
- Vite.
- TailwindCSS.
- React Router.
- Axios.
- react-hot-toast.
- lucide-react va Material Symbols cho icon.

Frontend co 3 khu vuc:

- Admin portal: can bo, ban giam hieu, quan tri vien.
- Student portal: sinh vien xem/tai van bang.
- Public verifier: nguoi ngoai upload PDF hoac quet QR de xac thuc.

### 3.3 Blockchain

Blockchain nam trong `blockchain/`, su dung:

- Solidity `^0.8.28`.
- Hardhat 3.
- ethers.js.
- Ethereum Sepolia testnet.

Smart contract chinh la `DocumentRegistry.sol`, co nhiem vu luu hash van bang va trang thai hop le/thu hoi.

## 4. Vai tro nguoi dung

He thong co 4 role:

| Role | Mo ta | Quyen chinh |
|---|---|---|
| `SYS_ADMIN` | Quan tri vien he thong | Xem toan bo van bang, tao nhap, ky duyet, thu hoi |
| `OFFICER` | Can bo nhap lieu/phong dao tao | Tao ban nhap thu cong, upload PDF, import CSV |
| `SIGNER` | Nguoi ky duyet/ban giam hieu | Duyet phat hanh, batch issue, thu hoi |
| `STUDENT` | Sinh vien | Xem feed van ban, xem va tai van bang cua minh |

Phan quyen duoc thuc hien o backend bang middleware `protect` va `authorize`, frontend dung `ProtectedRoute` de dieu huong theo role.

## 5. Luong nghiep vu chinh

### 5.1 Dang nhap

1. Nguoi dung nhap username/password.
2. Backend tim user trong MongoDB.
3. Mat khau duoc so sanh bang bcrypt.
4. Neu hop le, backend tra JWT va thong tin user.
5. Frontend luu token vao `localStorage`.
6. Moi request sau do tu dong gan header `Authorization: Bearer <token>`.

### 5.2 Tao ban nhap van bang

Can bo `OFFICER` hoac `SYS_ADMIN` co 3 cach tao ban nhap:

1. Nhap thu cong thong tin sinh vien.
2. Upload file PDF co san.
3. Import CSV de tao nhieu ban nhap.

Ban nhap duoc luu trong collection `documents` voi `status = DRAFT`. O giai doan nay chua co `docHash`, `txHash`, `ipfsHash` vi van chua phat hanh.

### 5.3 Phat hanh van bang

`SIGNER` hoac `SYS_ADMIN` thuc hien ky duyet:

1. Backend lay document `DRAFT`.
2. Tao `shortCode` va URL verify dang `/v/:shortCode`.
3. Neu document tao tu form: backend sinh PDF tu phoi bang.
4. Neu document tao tu PDF upload: backend copy PDF nhap va dong QR verify vao file.
5. Backend bam SHA-256 file PDF cuoi cung.
6. Neu co cau hinh Pinata, backend upload PDF len IPFS va luu `ipfsHash`.
7. Backend goi smart contract `issueDocument(bytes32 docHash)`.
8. Smart contract luu hash, issuer, timestamp, trang thai valid.
9. Backend luu `docHash`, `txHash`, `ipfsHash`, doi `status = ACTIVE`.
10. Backend tao `ShortLink` lien ket QR voi document.

Ket qua la mot file PDF da phat hanh tai `/uploads/<docId>.pdf`.

### 5.4 Phat hanh hang loat

Trang pending approval cho phep chon nhieu document `DRAFT` va goi:

```http
POST /api/docs/issue/batch
```

Backend xu ly tuan tu tung document de tranh qua tai blockchain. Ket qua tra ve danh sach thanh cong va danh sach loi rieng.

### 5.5 Thu hoi van bang

Voi van bang da `ACTIVE`, `SIGNER` hoac `SYS_ADMIN` co the thu hoi:

1. Frontend goi `POST /api/docs/revoke/:id`.
2. Backend kiem tra document dang `ACTIVE`.
3. Backend goi smart contract `revokeDocument(bytes32 docHash)`.
4. Contract danh dau `isValid = false`.
5. Backend cap nhat `status = REVOKED`.
6. Thong tin revoke duoc luu vao `metadata.revocation`.

Van bang sau khi thu hoi van con ton tai trong DB va on-chain de giu lich su, nhung verify se khong con hop le.

### 5.6 Xac thuc cong khai

Nguoi ngoai co 2 cach xac thuc:

1. Quet QR tren PDF:
   - QR tro den `/v/:shortCode`.
   - Backend redirect sang frontend `/verify?code=:shortCode`.
   - Frontend goi `/api/verify/code/:shortCode`.

2. Upload PDF:
   - Frontend gui PDF len `/api/verify/upload`.
   - Backend bam SHA-256 file upload.
   - Backend tim document co `docHash` trung khop.
   - Backend goi smart contract de lay trang thai on-chain.

Ket qua xac thuc gom:

- Thong tin sinh vien/van bang.
- `docHash`.
- `txHash`.
- `ipfsHash` neu co.
- Trang thai trong DB.
- Trang thai on-chain: valid, issuer, issuedAt.

## 6. Mo hinh du lieu

### 6.1 User

Collection `users` gom:

- `username`: ten dang nhap, unique.
- `password`: mat khau da hash.
- `fullName`: ho ten.
- `email`: email, unique.
- `role`: `SYS_ADMIN`, `OFFICER`, `SIGNER`, `STUDENT`.
- `studentId`: ma sinh vien, dung de map voi `Document.holderId`.
- `walletAddress`: dia chi vi, du kien dung cho signer.
- `status`: `ACTIVE` hoac `LOCKED`.

### 6.2 Document

Collection `documents` gom:

- `docId`: ma van ban/ma van bang.
- `docType`: `DIPLOMA`, `DECISION`, `TRANSCRIPT`.
- `degreeLevel`: `BACHELOR`, `ENGINEER`, `ARCHITECT`, `MASTER`, `DOCTOR`.
- `holderName`: ten nguoi duoc cap.
- `holderId`: ma sinh vien.
- `metadata`: du lieu linh hoat nhu nganh, xep loai, nam tot nghiep.
- `docHash`: SHA-256 cua file PDF da phat hanh.
- `ipfsHash`: CID IPFS neu upload Pinata thanh cong.
- `txHash`: transaction hash tren Sepolia khi issue.
- `issuer`: user tao/phat hanh.
- `status`: `DRAFT`, `ACTIVE`, `REVOKED`.
- `receivedAt`, `receivedBy`: ghi nhan sinh vien tai/nhan van bang.

### 6.3 ShortLink

Collection `shortlinks` gom:

- `shortCode`: ma ngan 6 ky tu.
- `document`: tham chieu document.
- `docHash`: hash van bang de tra cuu nhanh.
- `clicks`: so lan truy cap.
- `lastAccessed`: lan truy cap cuoi.

## 7. Smart contract

Contract `DocumentRegistry` luu du lieu toi thieu tren blockchain de tiet kiem gas:

```solidity
struct DocumentRecord {
    address issuer;
    bool isValid;
    bool exists;
    uint256 timestamp;
}
```

Mapping chinh:

```solidity
mapping(bytes32 => DocumentRecord) private _records;
```

Ham chinh:

- `issueDocument(bytes32 _docHash)`: admin contract ghi hash moi.
- `revokeDocument(bytes32 _docHash)`: admin contract thu hoi hash.
- `verifyDocument(bytes32 _docHash)`: bat ky ai cung co the doc trang thai hash.

Contract chi luu `bytes32` thay vi string de toi uu gas. Backend chuyen SHA-256 hex string thanh `0x...` truoc khi goi contract.

## 8. API chinh

### Auth

```http
POST /api/auth/login
GET  /api/auth/me
GET  /api/users/me
```

### Document

```http
GET  /api/docs
GET  /api/docs/:id
POST /api/docs/draft
POST /api/docs/draft/upload
POST /api/docs/draft/import-csv
POST /api/docs/issue/:id
POST /api/docs/issue/batch
POST /api/docs/revoke/:id
```

### Verify

```http
GET  /v/:shortCode
GET  /api/verify/code/:shortCode
GET  /api/verify/hash/:hash
POST /api/verify/upload
```

### Student

```http
GET  /api/student/feed
GET  /api/student/diplomas
POST /api/student/docs/:id/receive
```

## 9. Cau hinh moi truong

### Backend `.env`

Can cac bien chinh:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/d-cert
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=1d

BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
SIGNER_PRIVATE_KEY=your_private_key
CONTRACT_ADDRESS=0x...

PINATA_JWT=your_pinata_jwt
IPFS_REQUIRED=false
```

Ghi chu:

- `PINATA_JWT` la tuy chon. Neu khong co, he thong bo qua IPFS va van phat hanh duoc.
- Neu `IPFS_REQUIRED=true`, phat hanh se that bai khi upload IPFS loi.
- Vi deploy contract phai la cung vi backend dung de issue/revoke, vi contract dang chi cho `admin` goi ham ghi.

### Frontend

Frontend dung Vite proxy:

- `/api` -> `http://localhost:3000`
- `/v` -> `http://localhost:3000`
- `/uploads` -> `http://localhost:3000`

### Blockchain `.env`

```env
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
SIGNER_PRIVATE_KEY=your_private_key
```

Lenh deploy:

```bash
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

Sau khi deploy, copy `CONTRACT_ADDRESS` sang `backend/.env`.

## 10. Trang giao dien

### Admin

- `/login`: dang nhap.
- `/admin/docs/new`: tao ban nhap.
- `/admin/pending`: danh sach cho ky duyet va batch issue.
- `/admin/docs`: lich su/danh sach document.
- `/admin/docs/:id`: chi tiet, phat hanh, thu hoi, xem hash/tx/ipfs.
- `/admin/verify`: xac thuc noi bo bang hash hoac upload PDF.

### Student

- `/student`: feed van ban/quyet dinh moi.
- `/student/diplomas`: van bang ca nhan.
- `/student/requests`: placeholder cho yeu cau cap giay to.

### Public

- `/verify`: trang public verifier.
- `/verify?code=:shortCode`: mo tu QR trong PDF.

## 11. Trang thai hoan thien giai doan 1 va 2

### Da hoan thien

- Cau truc backend 3 lop.
- JWT authentication.
- RBAC theo role.
- MongoDB models: User, Document, ShortLink.
- Tao draft thu cong.
- Tao draft tu PDF upload.
- Import CSV tao nhieu draft.
- Sinh PDF tu phoi bang.
- Dong QR vao PDF.
- Bam SHA-256 file PDF.
- Phat hanh don va phat hanh hang loat.
- Ghi hash len smart contract Sepolia thong qua ethers.js.
- Thu hoi van bang on-chain.
- Verify bang upload PDF.
- Verify bang hash.
- Verify bang shortCode/QR.
- Public verifier UI.
- Student portal xem/tai van bang.
- IPFS service thong qua Pinata khi co cau hinh.
- Hardhat project va deploy script.

### Can lam de demo that tren Sepolia

- Dam bao contract da deploy len Sepolia.
- Dam bao vi deploy contract co ETH Sepolia va private key trong backend.
- Dien dung `CONTRACT_ADDRESS`, `ALCHEMY_RPC_URL`, `SIGNER_PRIVATE_KEY`.
- Tao du lieu user mau cho cac role.
- Test end-to-end bang Postman/browser:
  - login,
  - create draft,
  - issue,
  - open PDF,
  - scan QR,
  - upload verify,
  - revoke,
  - verify lai sau revoke.

### Chua thuoc pham vi hien tai

- AI OCR/NER.
- Chatbot RAG that.
- Quan ly sinh vien day du.
- Dashboard thong ke nang cao.
- Lich su audit rieng ngoai metadata.
- Ky dien tu bang vi nguoi dung tren frontend.

## 12. Huong phat trien giai doan 3

Sau khi giai doan 1 va 2 on dinh, giai doan 3 co the tap trung vao AI:

- OCR van bang/anh scan cu bang PaddleOCR.
- NER trich xuat truong thong tin bang PhoBERT.
- Tao endpoint `/api/ai/extract` de tu dong dien form cap bang.
- Xay dung chatbot hoc vu bang FAISS va Vietnamese bi-encoder.
- Tao endpoint `/api/ai/chat`.
- Tich hop chatbot that vao Student portal thay cho tra loi gia lap hien tai.

## 13. Gia tri noi bat cua du an

D-CERT co tinh thuc tien cao vi ket hop duoc quy trinh hanh chinh quen thuoc voi lop bao chung blockchain. He thong khong luu toan bo van bang len chain, ma chi luu hash de toi uu chi phi va bao ve du lieu ca nhan. PDF van bang van duoc quan ly trong backend/IPFS, con blockchain dong vai tro nhu so cai bat bien de doi chieu tinh toan ven.

Voi cau truc hien tai, du an du kha nang demo mot vong nghiep vu hoan chinh: tao ban nhap, ky duyet, phat hanh PDF, ghi hash len Sepolia, sinh QR, sinh vien tai ve, nha tuyen dung xac thuc, va thu hoi neu can.
