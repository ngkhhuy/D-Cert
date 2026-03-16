const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();

const path = require('path');

app.use(express.json()); 
app.use(cors());         
app.use(helmet());       
app.use(morgan('dev'));

// Serve file PDF văn bằng đã cấp phát — truy cập qua /uploads/<docId>.pdf
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: ' D-Cert API Server đang chạy' 
    });
});

const authRoutes   = require('./routes/authRoutes');
const docRoutes    = require('./routes/docRoutes');
const verifyRoutes = require('./routes/verifyRoutes');

// Public shortlink redirect — đặt ngoài /api để URL ngắn gọn: /v/:code
const { redirectShortLink } = require('./controllers/verifyController');
app.get('/v/:shortCode', redirectShortLink);

app.use('/api/auth',   authRoutes);
app.use('/api/docs',   docRoutes);
app.use('/api/verify', verifyRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`-----`);
    console.log(` Server đang chạy tại http://localhost:${PORT}`);
});