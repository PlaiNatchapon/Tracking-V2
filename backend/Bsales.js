// ไฟล์ Bsales.js
const express = require('express');
const router = express.Router();

// ห่อด้วยฟังก์ชันที่รับ pool เข้ามา (เพื่อให้เหมือนกับ Blogin.js ของคุณ)
module.exports = function(pool) {

    // เนื่องจากใน server.js เรากำหนด /api/products ไปแล้ว 
    // ตรงนี้เราจึงใส่แค่ /search เส้นทางเต็มจะกลายเป็น /api/products/search อัตโนมัติ
    router.get('/search', async (req, res) => {
        try {
            const keyword = req.query.q || '';
            
            const query = `
                SELECT product_code, product_name, category_brand, details, cost_price, selling_price, stock_remaining 
                FROM product_inventory 
                WHERE product_code ILIKE $1 OR product_name ILIKE $2
                LIMIT 10;
            `;
            
            const values = [`%${keyword}%`, `%${keyword}%`];
            const result = await pool.query(query, values);

            res.json(result.rows);
        } catch (err) {
            console.error("Database search error:", err.message);
            res.status(500).send('Server Error');
        }
    });










    router.post('/orders', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // เริ่ม Transaction

        const { employeeId, employeeName, department, quotationImage, deliveryImage, suggestions, items } = req.body;

        // 1. บันทึกข้อมูลหัวบิลลงตาราง orders
        const orderQuery = `
            INSERT INTO orders (employee_id, employee_name, department, quotation_image, delivery_image, suggestions)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const orderResult = await client.query(orderQuery, [
            employeeId, employeeName, department, quotationImage, deliveryImage || null, suggestions || ''
        ]);
        
        const newOrderId = orderResult.rows[0].id;

        // 2. วนลูปบันทึกรายการสินค้า และ ตัดสต็อกสินค้าจริง
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // 2.1 บันทึกลงตาราง order_items
            const itemQuery = `
                INSERT INTO order_items (order_id, item_no, product_code, product_name, category, description, cost_price, selling_price, stock_at_time, quantity_taken)
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

            // 2.2 ตัดสต็อกจริงจากตาราง product_inventory
            const updateStockQuery = `
                UPDATE product_inventory 
                SET stock_remaining = stock_remaining - $1 
                WHERE product_code = $2;
            `;
            await client.query(updateStockQuery, [item.buyQty, item.code]);
        }

        await client.query('COMMIT'); // ยืนยันการทำงานทั้งหมด
        res.status(201).json({ success: true, message: "บันทึกคำสั่งซื้อและตัดสต็อกสำเร็จ", orderId: newOrderId });

    } catch (err) {
        await client.query('ROLLBACK'); // ยกเลิกทั้งหมดถ้าเกิดข้อผิดพลาด
        console.error("Error saving order:", err.message);
        res.status(500).json({ success: false, message: 'Server Error: ไม่สามารถบันทึกข้อมูลได้' });
    } finally {
        client.release();
    }
});
    return router;
};