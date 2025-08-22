import {pool} from "../libs/database.js";

export const getCafeterias = async(req, res) => {
    try {
        const cafeterias = await pool.query({text: "SELECT * FROM tblcafeteria"});

        if (cafeterias.rows.length === 0) {
            return res
                .status(404)
                .json({status: "failed", message: "No cafeterias found"});
        }

        res
            .status(200)
            .json({status: "success", message: "Cafeterias retrieved successfully", data: cafeterias.rows});

    } catch (error) {
        console.error("Error retrieving cafeterias:", error);
        res
            .status(500)
            .json({status: "error", message: "Internal Server Error"});
    }
};

export const getCafeteriaById = async(req, res) => {
    try {
        const {id} = req.params;
        const cafeteria = await pool.query({text: "SELECT * FROM tblcafeteria WHERE id = $1", values: [id]});

        if (cafeteria.rows.length === 0) {
            return res
                .status(404)
                .json({status: "failed", message: "Cafeteria not found"});
        }

        res
            .status(200)
            .json({status: "success", message: "Cafeteria retrieved successfully", data: cafeteria.rows[0]});

    } catch (error) {
        console.error("Error retrieving cafeteria by ID:", error);
        res
            .status(500)
            .json({status: "error", message: "Internal Server Error"});
    }
};

export const createCafeteria = async(req, res) => {
    try {
        const {cafeteria_name, location} = req.body;

        if (!cafeteria_name || !location) {
            return res
                .status(400)
                .json({status: "failed", message: "All fields are required"});
        }

        const newCafeteria = await pool.query({
            text: "INSERT INTO tblcafeteria (cafeteria_name, location) VALUES ($1, $2) RETURNING *",
            values: [cafeteria_name, location]
        });

        res
            .status(201)
            .json({status: "success", message: "Cafeteria created successfully", data: newCafeteria.rows[0]});

    } catch (error) {
        console.error("Error creating cafeteria:", error);
        res
            .status(500)
            .json({status: "error", message: "Internal Server Error"});
    }
};

export const updateCafeteria = async(req, res) => {
    try {
        const {id} = req.params;
        const {cafeteria_name, location} = req.body;

        const cafeteriaExists = await pool.query({text: "SELECT * FROM tblcafeteria WHERE id = $1", values: [id]});

        if (cafeteriaExists.rows.length === 0) {
            return res
                .status(404)
                .json({status: "failed", message: "Cafeteria not found"});
        }

        const updatedCafeteria = await pool.query({
            text: "UPDATE tblcafeteria SET cafeteria_name = $1, location = $2, updated_at = CURRENT" +
                    "_TIMESTAMP WHERE id = $3 RETURNING *",
            values: [
                cafeteria_name || cafeteriaExists.rows[0].cafeteria_name,
                location || cafeteriaExists.rows[0].location,
                id
            ]
        });

        res
            .status(200)
            .json({status: "success", message: "Cafeteria updated successfully", data: updatedCafeteria.rows[0]});

    } catch (error) {
        console.error("Error updating cafeteria:", error);
        res
            .status(500)
            .json({status: "error", message: "Internal Server Error"});
    }
};

export const deleteCafeteria = async(req, res) => {
    try {
        const {id} = req.params;

        const cafeteriaExists = await pool.query({text: "SELECT * FROM tblcafeteria WHERE id = $1", values: [id]});

        if (cafeteriaExists.rows.length === 0) {
            return res
                .status(404)
                .json({status: "failed", message: "Cafeteria not found"});
        }

        await pool.query({text: "DELETE FROM tblcafeteria WHERE id = $1", values: [id]});

        res
            .status(200)
            .json({status: "success", message: "Cafeteria deleted successfully"});

    } catch (error) {
        console.error("Error deleting cafeteria:", error);
        res
            .status(500)
            .json({status: "error", message: "Internal Server Error"});
    }
};
