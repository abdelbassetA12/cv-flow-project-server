const mongoose = require("mongoose");
const Admin = require("./models/Admin"); // تأكد من مسار موديل الأدمن الصحيح

// ربط مع قاعدة البيانات - عدل الرابط حسب مشروعك
mongoose.connect("mongodb+srv://abdelbassetelhajiri02:yTEsrVmmSeyRkhte@cluster0.rdkbbev.mongodb.net/models?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB connection error:", err));

async function createAdmin() {
  try {
    const existing = await Admin.findOne({ email: "admin@example.com" });
    if (existing) {
      console.log("الأدمن موجود مسبقًا!");
      process.exit(0);
    }

    const admin = new Admin({
      email: "admin@example.com",
      password: "admin123", // كلمة المرور سيتم تشفيرها تلقائيًا في الموديل
    });

    await admin.save();
    console.log("تم إنشاء حساب الأدمن بنجاح!");
    process.exit(0);
  } catch (err) {
    console.error("حدث خطأ أثناء إنشاء الأدمن:", err);
    process.exit(1);
  }
}

createAdmin();
