const express = require('express');

module.exports = function (pool, io) {
    const router = express.Router();

    // ==========================================
    // 1. ดึงรายการออเดอร์ที่มีหลักฐานการชำระเงิน (เฉพาะที่ยังไม่ปิดงาน)
    // ==========================================
    router.get('/orders', async (req, res) => {
        try {
            const query = `
                SELECT 
                    o.id,
                    o.status,
                    dr.delivery_person_name,
                    dr.delivery_department,
                    COALESCE(dr.payment_slip, c.payment_slip, o.payment_slip) AS payment_slip,
                    dr.created_at AS delivery_time
                FROM orders o
                LEFT JOIN delivery_results dr ON o.id = dr.order_id
                LEFT JOIN order_checks c ON o.id = c.order_id
                WHERE COALESCE(dr.payment_slip, c.payment_slip, o.payment_slip) IS NOT NULL
                  AND o.status != 'completed'
                ORDER BY dr.created_at DESC NULLS LAST;
            `;
            const { rows } = await pool.query(query);
            res.json(rows);
        } catch (error) {
            console.error("Error fetching accounting orders:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // ==========================================
    // 2. ดูรายละเอียดผู้ปฏิบัติงานทั้งหมด & เอกสาร (ปุ่มดูรายละเอียด)
    // ==========================================
    router.get('/orders/:id/details', async (req, res) => {
        const { id } = req.params;
        try {
            const query = `
                SELECT 
                    o.id AS order_id,
                    o.status,
                    -- 1. คนเปิดบิล (Sales / Admin)
                    o.employee_name AS creator_name,
                    o.department AS creator_department,
                    
                    -- 2. คนจัดของ (Fulfillment)
                    f.fullname AS fulfillment_name,
                    f.department AS fulfillment_department,
                    
                    -- 3. คนตรวจของ (Checker)
                    c.checker_name AS checker_name,
                    c.department AS checker_department,
                    
                    -- 4. คนส่งของ (Delivery)
                    dr.delivery_person_name,
                    dr.delivery_department,
                    
                    -- รูปภาพและเอกสารต่างๆ
                    o.quotation_image,
                    o.delivery_image,
                    c.packing_photos,
                    dr.goods_photos,
                    COALESCE(dr.payment_slip, c.payment_slip, o.payment_slip) AS payment_slip

                FROM orders o
                LEFT JOIN order_fulfillments f ON o.id = f.order_id
                LEFT JOIN order_checks c ON o.id = c.order_id
                LEFT JOIN delivery_results dr ON o.id = dr.order_id
                WHERE o.id = $1;
            `;
            const { rows } = await pool.query(query, [id]);

            if (rows.length === 0) {
                return res.status(404).json({ error: "Order not found" });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error("Error fetching order details:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // ==========================================
    // 3. ปิดงาน / ยืนยันสลิปถูกต้อง (ปุ่มปิดงาน)
    // ==========================================
    router.put('/orders/:id/verify', async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            const checkOrder = await client.query('SELECT id FROM orders WHERE id = $1', [id]);
            if (checkOrder.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: "Order not found" });
            }

            // อัปเดตสถานะในตาราง orders เป็น 'completed'
            const updateQuery = `
                UPDATE orders 
                SET status = 'completed' 
                WHERE id = $1 
                RETURNING id;
            `;
            await client.query(updateQuery, [id]);

            await client.query('COMMIT');

            // แจ้งเตือนแบบ Real-time ผ่าน Socket.io ไปยังทุก Client (ถ้าต้องการ)
            if (io) {
                io.emit('order_completed', { order_id: id });
            }

            res.json({ message: "อัปเดตสถานะปิดงานสำเร็จ", order_id: id });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Error verifying order:", error);
            res.status(500).json({ error: "Internal Server Error" });
        } finally {
            client.release();
        }
    });

    return router;
};