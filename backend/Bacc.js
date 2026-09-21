const express = require('express');

module.exports = function (pool, io) {
    const router = express.Router();

 // ==========================================
    // 1. ดึงรายการออเดอร์ (มองจากคอลัมน์ accounting_status เป็นหลัก)
    // ==========================================
  router.get('/orders', async (req, res) => {
        try {
            const query = `
                SELECT 
                    o.id,
                    o.status,
                    o.accounting_status,
                    o.employee_name AS creator_name,      -- ชื่อพนักงานผู้เปิดบิล/สร้างออเดอร์
                    o.department AS creator_department,   -- แผนกของผู้สร้างออเดอร์
                    o.vehicle_selection,                  -- รหัสรถ / ยานพาหนะที่ใช้
                    COALESCE(dr.delivery_person_name, 'ไม่ระบุ') AS delivery_person_name,
                    COALESCE(dr.delivery_department, o.department) AS delivery_department,
                    COALESCE(o.payment_slip, dr.payment_slip, c.payment_slip) AS payment_slip,
                    COALESCE(dr.created_at, o.created_at) AS delivery_time
                FROM orders o
                LEFT JOIN delivery_results dr ON o.id = dr.order_id
                LEFT JOIN order_checks c ON o.id = c.order_id
                WHERE COALESCE(o.payment_slip, dr.payment_slip, c.payment_slip) IS NOT NULL
                  AND (o.accounting_status IS NULL OR o.accounting_status != 'approved')
                ORDER BY o.id DESC;
            `;
            const { rows } = await pool.query(query);
            res.json(rows);
        } catch (error) {
            console.error("Error fetching accounting orders:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
    // ==========================================
    // 2. ปุ่มยืนยันการชำระเงิน (อัปเดตเฉพาะคอลัมน์ accounting_status)
    // ==========================================
  router.put('/orders/:id/verify', async (req, res) => {
    const { id } = req.params;
    try {
        const updateQuery = `
            UPDATE orders 
            SET accounting_status = 'approved' 
            WHERE id = $1 AND (accounting_status IS NULL OR accounting_status != 'approved')
            RETURNING id;
        `;
        const result = await pool.query(updateQuery, [id]);
        
        // ถ้า rowCount เป็น 0 แปลว่ามีคนอื่นกดยืนยันตัดหน้าไปก่อนแล้ว
        if (result.rowCount === 0) {
            return res.status(400).json({ error: "ออเดอร์นี้ถูกยืนยันการชำระเงินไปเรียบร้อยแล้วโดยผู้ใช้งานท่านอื่น" });
        }

        res.json({ message: "ยืนยันการชำระเงินสำเร็จ", order_id: id });
    } catch (error) {
        console.error("Error verifying payment:", error);
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