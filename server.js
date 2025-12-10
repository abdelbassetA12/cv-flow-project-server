







const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const mongoose = require('mongoose');
//const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const AdminAuthRoutes = require('./routes/adminAuthRoutes');
//const authMiddleware = require('./middleware/authMiddleware');

const favoriteRoutes = require('./routes/favoriteTemplates');
const paymentRoutes = require('./routes/payment');
const referralRoutes = require('./routes/referral');
const withdrawRoutes = require('./routes/withdraw');

const bankTransferRouter = require('./routes/bankTransferRouter');
const manualWithdrawalsRoute = require('./routes/manualWithdrawals');
const contactRoutes = require('./routes/contactRoutes');
const statsRoutes = require("./routes/stats");
const analyticsRoutes = require("./routes/analyticsRoutes");
const savedProjectsRoutes = require('./routes/savedProjects');
const templatesRouter = require('./routes/templates');

// للكوكي
const cookieParser = require("cookie-parser");


const app = express();
const PORT = process.env.PORT ;

/*

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
*/
app.use(express.json());
app.disable("x-powered-by");


// للكوكي
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // مسموح 5 محاولات فقط
  message: "Too many login attempts, try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/*
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // دقيقة
  max: 60, // 60 طلب فقط في الدقيقة لكل IP
  message: "Too many requests, slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});
*/






// إزالة أي علامات قد تستخدم لحقن MongoDB

// أو بشكل أكثر تحديدًا:

app.use((req, res, next) => {
  req.body && mongoSanitize.sanitize(req.body);
  req.query && mongoSanitize.sanitize(req.query);
  req.params && mongoSanitize.sanitize(req.params);
  next();
});



// تفعيل Helmet لحماية السيرفر من حقن سكريبتات js
//app.use(helmet());
/*
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
*/







/*


//app.use(cors());
const allowedOrigins = [
  process.env.CLIENT_URL, // واجهة المستخدم العادي
  process.env.ADMIN_URL   // واجهة الأدمن
];

app.use(cors({
  origin: function(origin, callback){
    // origin يمكن أن يكون undefined عند اختبار Postman أو curl
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) !== -1){
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
*/

app.use(cors({
 origin: [process.env.CLIENT_URL, process.env.ADMIN_URL],
credentials: true

 
}));





// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error(' MongoDB error:', err));

app.post("/api/auth/login", loginLimiter);

// المسارات


app.use('/api/auth', authRoutes);
app.use('/api/authadmin', AdminAuthRoutes);
app.use('/api/saved-projects', savedProjectsRoutes);

app.use('/api/favorites', favoriteRoutes);
app.use('/api/payment', paymentRoutes);

app.use('/api/referral', referralRoutes); 
app.use('/api/withdraw', withdrawRoutes); 
app.use('/api/bank-transfer', bankTransferRouter);

app.use('/api/manual-withdrawals', manualWithdrawalsRoute);
app.use("/api/contact", contactRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use("/api/templates", templatesRouter);
  //app.use("/api", apiLimiter);



app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


/*
// عرض كل القوالب المتاحة (يتطلب تسجيل الدخول)
app.get('/api/templates/:category/:name', async (req, res) => {
  const { category, name } = req.params;

  try {
    const fileName = name.endsWith('.html') ? name : `${name}.html`;
const templatePath = path.join(__dirname, 'templates', category, fileName);

    const html = fs.readFileSync(templatePath, 'utf8');
    res.json({ html });
  } catch (error) {
    console.error("Error loading template:", error);
    res.status(500).send('Template not found');
  }
});



app.get('/api/templates', authMiddleware, (req, res) => {
  try {
    const templatesDir = path.join(__dirname, 'templates');
    const categories = ['basic', 'pro', 'premium'];

    let allTemplates = [];

    categories.forEach(category => {
      const categoryPath = path.join(templatesDir, category);

      if (fs.existsSync(categoryPath)) {
        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.html'));
        files.forEach(file => {
          // قم بإرجاع القالب مع تصنيفه
          allTemplates.push(`${category}/${file.replace('.html', '')}`);
        });
      }
    });

    res.json({ templates: allTemplates });
  } catch (error) {
    console.error("Error fetching templates list:", error);
    res.status(500).json({ message: "خطأ في جلب قائمة القوالب" });
  }
});
*/

app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});










