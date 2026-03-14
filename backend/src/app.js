const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();

app.use(express.json()); 
app.use(cors());         
app.use(helmet());       
app.use(morgan('dev'));  

app.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: ' D-Cert API Server đang chạy' 
    });
});

// 6. Lắng nghe ở cổng PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`-----`);
    console.log(` Server đang chạy tại http://localhost:${PORT}`);
});