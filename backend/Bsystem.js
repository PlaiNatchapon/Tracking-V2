
const express = require('express');

module.exports = function (pool, io) {
    const router = express.Router();

    console.log("🔥 โหลด Bsystem (Admin Routes) สำเร็จ!");

    // =========================================================================
    // 1. ดึงรายการออเดอร์ทั้งหมด
    // =========================================================================
    router.get('/orders', async (req, res) => {
        try {
            const query = `
                SELECT
                    o.id AS "id",

                    COALESCE(
                        dc.delivery_person_name,
                        oc.checker_name,
                        of_fill.fullname,
                        o.employee_name,
                        'ไม่ระบุ'
                    ) AS "operator",

                    COALESCE(
                        dc.delivery_department,
                        oc.department,
                        of_fill.department,
                        o.department,
                        'Warehouse'
                    ) AS "department",

                    COALESCE(
                        oc.vehicle_selection,
                        o.vehicle_selection,
                        'ไม่ระบุ'
                    ) AS "vehicle",

                    CASE
                        -- งานเสร็จสิ้นจริง ต้องผ่านการอนุมัติจากบัญชีเท่านั้น
                        WHEN o.accounting_status = 'approved'
                        THEN 'งานเสร็จสิ้น'

                        -- ฝ่ายขายแนบสลิปแล้ว รอฝ่ายบัญชีตรวจสอบ
                        WHEN NULLIF(TRIM(o.payment_slip), '') IS NOT NULL
                        THEN 'รอบัญชีตรวจสอบ'

                        -- รับสินค้าเองที่ร้าน และมีหลักฐานจาก Warehouse
                        WHEN (
                            o.vehicle_selection = 'pickup-self'
                            OR oc.vehicle_selection = 'pickup-self'
                        )
                        AND o.payment_slip IS NOT NULL
                        THEN 'รอฝ่ายบัญชีตรวจหลักฐานชำระเงิน'

                        -- Logistic ส่งของแล้ว และมีหลักฐานชำระเงิน
                        WHEN dc.id IS NOT NULL
                        AND COALESCE(
                            o.payment_slip,
                            dc.payment_slip
                        ) IS NOT NULL
                        THEN 'ส่งของแล้ว / รอฝ่ายบัญชีตรวจหลักฐานชำระเงิน'

                        -- Logistic ส่งของแล้ว แต่ยังไม่มีหลักฐานชำระเงิน
                        WHEN dc.id IS NOT NULL
                        THEN 'ส่งของแล้ว'

                        -- รับสินค้าเอง แต่ยังไม่มีหลักฐานชำระเงิน
                        WHEN (
                            o.vehicle_selection = 'pickup-self'
                            OR oc.vehicle_selection = 'pickup-self'
                        )
                        THEN 'รับสินค้าเอง / รอหลักฐานชำระเงิน'

                        -- Checker ตรวจรถแล้ว
                        WHEN oc.id IS NOT NULL
                        THEN 'ตรวจรถแล้ว'

                        -- Warehouse เริ่มดำเนินการแล้ว
                        WHEN of_fill.id IS NOT NULL
                        THEN 'กำลังแพ็คสินค้า'

                        ELSE 'รอดำเนินการ'
                    END AS "statusText",

                    CASE
                        WHEN o.accounting_status = 'approved'
                        THEN 'badge-success'

                        -- สีสถานะรอบัญชีตรวจสอบ
                        WHEN NULLIF(TRIM(o.payment_slip), '') IS NOT NULL
                        THEN 'badge-warning'

                        WHEN (
                            (
                                o.vehicle_selection = 'pickup-self'
                                OR oc.vehicle_selection = 'pickup-self'
                            )
                            AND o.payment_slip IS NOT NULL
                        )
                        THEN 'badge-warning'

                        WHEN dc.id IS NOT NULL
                        AND COALESCE(
                            o.payment_slip,
                            dc.payment_slip
                        ) IS NOT NULL
                        THEN 'badge-warning'

                        WHEN (
                            o.vehicle_selection = 'pickup-self'
                            OR oc.vehicle_selection = 'pickup-self'
                        )
                        THEN 'badge-warning'

                        WHEN dc.id IS NOT NULL
                        THEN 'badge-info'

                        WHEN oc.id IS NOT NULL
                        THEN 'badge-info'

                        WHEN of_fill.id IS NOT NULL
                        THEN 'badge-warning'

                        ELSE 'badge-secondary'
                    END AS "badgeClass",

                    CASE
                        WHEN o.accounting_status = 'approved'
                        THEN 'check-circle-2'

                        -- ไอคอนสถานะรอบัญชีตรวจสอบ
                        WHEN NULLIF(TRIM(o.payment_slip), '') IS NOT NULL
                        THEN 'clock'

                        WHEN (
                            (
                                o.vehicle_selection = 'pickup-self'
                                OR oc.vehicle_selection = 'pickup-self'
                            )
                            AND o.payment_slip IS NOT NULL
                        )
                        THEN 'clock'

                        WHEN dc.id IS NOT NULL
                        AND COALESCE(
                            o.payment_slip,
                            dc.payment_slip
                        ) IS NOT NULL
                        THEN 'clock'

                        WHEN (
                            o.vehicle_selection = 'pickup-self'
                            OR oc.vehicle_selection = 'pickup-self'
                        )
                        THEN 'clock'

                        WHEN dc.id IS NOT NULL
                        THEN 'truck'

                        WHEN oc.id IS NOT NULL
                        THEN 'truck'

                        WHEN of_fill.id IS NOT NULL
                        THEN 'package'

                        ELSE 'clock'
                    END AS "icon",

                    o.status AS "status",
                    o.accounting_status AS "accounting_status",

                    COALESCE(
                        o.payment_slip,
                        dc.payment_slip,
                        oc.payment_slip
                    ) AS "payment_slip"

                FROM orders o

                LEFT JOIN order_fulfillments of_fill
                    ON o.id = of_fill.order_id

                LEFT JOIN order_checks oc
                    ON o.id = oc.order_id

                LEFT JOIN delivery_results dc
                    ON o.id = dc.order_id

                ORDER BY o.id DESC;
            `;

            const result = await pool.query(query);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (err) {
            console.error(
                "Error fetching detailed orders:",
                err.message
            );

            res.status(500).json({
                success: false,
                error: "เกิดข้อผิดพลาดในการดึงข้อมูลสถานะออเดอร์แบบละเอียด"
            });
        }
    });


    // =========================================================================
    // 2. ดึงข้อมูล Timeline ของออเดอร์
    // =========================================================================
    router.get('/:id/timeline', async (req, res) => {
        const { id } = req.params;

        try {
            const query = `
                SELECT
                    step_title,
                    step_desc,
                    step_time,
                    status_type
                FROM order_timelines
                WHERE order_id = $1
                ORDER BY id ASC;
            `;

            const result = await pool.query(query, [id]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (err) {
            console.error(
                "Error fetching timeline:",
                err.message
            );

            res.status(500).json({
                success: false,
                error: "เกิดข้อผิดพลาดในการดึงข้อมูล Timeline"
            });
        }
    });


    // =========================================================================
    // 3. เพิ่มออเดอร์ใหม่
    // =========================================================================
    router.post('/', async (req, res) => {
        const {
            operator,
            department,
            vehicle
        } = req.body;

        try {
            const query = `
                INSERT INTO orders (
                    employee_name,
                    department,
                    vehicle_selection
                )
                VALUES ($1, $2, $3)
                RETURNING *;
            `;

            const values = [
                operator || 'ไม่ระบุ',
                department || 'Warehouse',
                vehicle || 'ไม่ระบุ'
            ];

            const result = await pool.query(query, values);
            const newOrder = result.rows[0];

            if (io) {
                io.emit("orderUpdated", {
                    type: 'INSERT',
                    data: newOrder
                });
            }

            res.status(201).json({
                success: true,
                message: "บันทึกออเดอร์สำเร็จ",
                data: newOrder
            });

        } catch (err) {
            console.error(
                "Error inserting order:",
                err.message
            );

            res.status(500).json({
                success: false,
                error: "เกิดข้อผิดพลาดในการบันทึกออเดอร์"
            });
        }
    });

    return router;
};
