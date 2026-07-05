// import express from "express";
// import connection from "../mysql";
// import { v4 as uuidv4 } from 'uuid';
// import { validateDataStructure, validatePhone, validateEmail } from "../utils/warehouse-validation.js";
export {};
// const router = express.Router();
// router.route("/")
//     .get(async (req, res) => {
//         const sql = "SELECT * FROM warehouses";
//         try {
//             const [results] = await connection.query(sql);
//             res.status(200).json(results);
//         } catch (error) {
//             console.log(error);
//             res.status(500).send("Error Occured on server");
//         }
//     })
//     .post(async (req, res) => {
//         const sql = `INSERT INTO warehouses SET ?`;
//         const formResponse = req.body;
//         const structureError = validateDataStructure(formResponse);
//         const emailError = validateEmail(formResponse);
//         const phoneError = validatePhone(formResponse);
//         if (structureError) {
//             res.status(400).send("Data structure incorrect");
//         } else if (emailError) {
//             res.status(400).send("Email structure incorrect");
//         } else if (phoneError) {
//             res.status(400).send("Phone structure incorrect");
//         } else {
//             try {
//                 const [results] = await connection.query(sql, req.body);
//                 const newEntryId = results.insertId;
//                 const confirmationSql = `SELECT * FROM warehouses WHERE id = ${newEntryId }`;
//                 const [rows] = await connection.query(confirmationSql);
//                 res.status(200).json(rows);
//             } catch (error) {
//                 console.log(error);
//                 res.status(500).send("Error occured on server");
//             };
//         };
//     })
// router.route("/:id")
//     .get(async (req, res) => {
//         const warehouseId = req.params.id;
//         const sql = `SELECT * FROM warehouses WHERE warehouses.id = ?`;
//         try {
//             const [results] = await connection.query(sql, [warehouseId]);
//             if (results.length === 0) {
//                 return res.status(404).json({
//                     message: `No warehouse found with id ${warehouseId}`
//                 });
//             }
//             res.json(results[0]);
//         } catch (error) {
//             console.log(error);
//             res.status(500).send("Error occured on the server");
//         }
//     })
//     .delete(async (req, res) => {
//         const warehouseId = req.params.id;
//         try {
//             const [result] = await connection.query(
//                 "DELETE FROM warehouses WHERE id = ?",
//                 [warehouseId]
//             );
//             if (result.affectedRows === 0) {
//                 return res.status(404).json({
//                     message: `Warehouse with ID ${warehouseId} not found`
//                 });
//             }
//             res.sendStatus(204);
//         } catch (error) {
//             console.log(error);
//             res.status(500).send("Error occured on the server");
//         }
//     })
//     .patch(async (req, res) => {
//         const sql = `UPDATE warehouses 
//                     SET ?
//                     WHERE warehouses.id = ?`;
//         const formResponse = req.body;
//         const structureError = validateDataStructure(formResponse);
//         const emailError = validateEmail(formResponse);
//         const phoneError = validatePhone(formResponse);
//         if (structureError) {
//             res.status(400).send("Data structure incorrect");
//         } else if (emailError) {
//             res.status(400).send("Email structure incorrect");
//         } else if (phoneError) {
//             res.status(400).send("Phone structure incorrect");
//         } else {
//             try {
//                 const [results] = await connection.query(sql, [req.body, req.params.id]);
//                 const newEntryId = results.affectedRows;
//                 const confirmationSql = `SELECT * FROM warehouses WHERE id = ${newEntryId }`;
//                 const [rows] = await connection.query(confirmationSql);
//                 res.status(200).json(rows);
//             } catch (error) {
//                 console.log(error);
//                 res.status(500).send("Error occured on the server");
//             };
//         };
//     });
// router.route("/:id/inventories").get(async (req, res) => {
//     const { id } = req.params;
//     try {
//         const [warehouseExists] = await connection.query(
//             "SELECT id FROM warehouses WHERE id = ?",
//             [id]
//         );
//         if (warehouseExists.length === 0) {
//             return res.status(404).json({
//                 message: `Warehouse with ID ${id} not found`
//             });
//         }
//         const sql = `
//             SELECT 
//                 id, 
//                 item_name, 
//                 category, 
//                 status, 
//                 quantity
//             FROM inventories 
//             WHERE warehouse_id = ?
//         `;
//         const [inventories] = await connection.query(sql, [id]);
//         res.status(200).json(inventories);
//     } catch (error) {
//         console.log(error);
//         res.status(500).send("Error occurred on the server");
//     }
// });
// export default router;
//# sourceMappingURL=order_items.js.map