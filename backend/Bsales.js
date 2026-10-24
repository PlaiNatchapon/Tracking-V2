
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ==========================================
// ตั้งค่าโฟลเดอร์ uploads/ สำหรับเก็บรูปสลิป
// ==========================================
const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);

        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // จำกัดขนาดไฟล์ 10 MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('กรุณาเลือกไฟล์รูปภาพเท่านั้น'));
        }
    }
});

// ==========================================
// Routes
// ==========================================
module.exports = function (pool) {

    // ==========================================
    // 1. ค้นหาสินค้า
    // URL: /api/products/search
    // ==========================================
    router.get('/search', async (req, res) => {
        try {
            const keyword = req.query.q || '';

            const query = `
                SELECT
                    product_code,
                    product_name,
                    category_brand,
                    details,
                    cost_price,
                    selling_price,
                    stock_remaining
                FROM product_inventory
                WHERE product_code ILIKE $1
                   OR product_name ILIKE $2
                LIMIT 10;
            `;

            const values = [
                `%${keyword}%`,
                `%${keyword}%`
            ];

            const result = await pool.query(query, values);

            res.json(result.rows);
        } catch (err) {
            console.error('Database search error:', err.message);
            res.status(500).send('Server Error');
        }
    });

    // ==========================================
    // 2. บันทึกคำสั่งซื้อ พร้อมอัปโหลดสลิป
    // URL: /api/products/orders
    // ==========================================
    router.post(
        '/orders',
        upload.single('payment_slip'),
        async (req, res) => {

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // รับข้อมูลออเดอร์จาก FormData
                const {
                    employeeId,
                    employeeName,
                    department,
                    quotationImage,
                    deliveryImage,
                    suggestions,
                    items
                } = JSON.parse(req.body.payload);

                // ตำแหน่งไฟล์สลิปที่บันทึกใน uploads/
                const paymentSlipPath = req.file
                    ? `/uploads/${req.file.filename}`
                    : null;

                // ==========================================
                // 2.1 บันทึกข้อมูลหัวบิลลงตาราง orders
                // ==========================================
                const orderQuery = `
                    INSERT INTO orders (
                        employee_id,
                        employee_name,
                        department,
                        quotation_image,
                        delivery_image,
                        suggestions,
                        payment_slip
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id;
                `;

                const orderResult = await client.query(orderQuery, [
                    employeeId,
                    employeeName,
                    department,
                    quotationImage,
                    deliveryImage || null,
                    suggestions || '',
                    paymentSlipPath
                ]);

                const newOrderId = orderResult.rows[0].id;

                // ==========================================
                // 2.2 บันทึกรายการสินค้า และตัดสต็อก
                // ==========================================
                if (!Array.isArray(items)) {
                    throw new Error('ข้อมูลรายการสินค้าไม่ถูกต้อง');
                }

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];

                    // บันทึกรายการสินค้าลง order_items
                    const itemQuery = `
                        INSERT INTO order_items (
                            order_id,
                            item_no,
                            product_code,
                            product_name,
                            category,
                            description,
                            cost_price,
                            selling_price,
                            stock_at_time,
                            quantity_taken
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
                    `;

                    await client.query(itemQuery, [
                        newOrderId,
                        i + 1,
                        item.code,
                        item.name,
                        item.category,
                        item.description,
                        item.cost,
                        item.sale,
                        item.stock,
                        item.buyQty
                    ]);

                    // ตัดสต็อกสินค้า
                    const updateStockQuery = `
                        UPDATE product_inventory
                        SET stock_remaining = stock_remaining - $1
                        WHERE product_code = $2;
                    `;

                    await client.query(updateStockQuery, [
                        item.buyQty,
                        item.code
                    ]);
                }

                // ยืนยันการบันทึกทั้งหมด
                await client.query('COMMIT');

                res.status(201).json({
                    success: true,
                    message: 'บันทึกคำสั่งซื้อและตัดสต็อกสำเร็จ',
                    orderId: newOrderId
                });

            } catch (err) {
                await client.query('ROLLBACK');

                console.error('Error saving order:', err.message);

                // ลบไฟล์สลิปหากบันทึกออเดอร์ไม่สำเร็จ
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error(
                                'Error deleting uploaded slip:',
                                unlinkErr.message
                            );
                        }
                    });
                }

                res.status(500).json({
                    success: false,
                    message: 'Server Error: ไม่สามารถบันทึกข้อมูลได้'
                });

            } finally {
                client.release();
            }
        }
    );

    return router;
};
