import { comparePassword, hashPassword } from "../libs/index.js";
import { pool } from "../libs/database.js";

export const getUser = async (req, res) => {
  try {
    const { userId } = req.body.user;
    const userExists = await pool.query({
        text: "SELECT * FROM tbluser WHERE id = $1",
        values: [userId]
    });
    const user = userExists.rows[0];
    if (!user) {
      return res.status(404).json({
        status: "failed",
        message: "User not found"});
    }

    user.password = undefined; // Exclude password from response
    res.status(200).json({
      status: "success",
      message: "User retrieved successfully",
      user: user
    });
    
  } catch (error) {
    console.error("Error retrieving user:", error); 
  }
}

export const changePassword = async (req, res) => {
    try {
        const {userId} = req.body.user;
        const{currentPassword, newPassword, confirmPassword} = req.body;
        const userExists = await pool.query({
            text: "SELECT * FROM tbluser WHERE id = $1",
            values: [userId]
        });
        const user = userExists.rows[0];
        if (!user) {
        return res.status(404).json({
            status: "failed",
            message: "User not found"
        });
        }
        if(newPassword !== confirmPassword) {
        return res.status(400).json({
            status: "failed",
            message: "New password and confirm password do not match"
        });
        }
        const isMatch = await comparePassword(currentPassword, user?.password);
        if (!isMatch) {
        return res.status(400).json({
            status: "failed",
            message: "Current password is incorrect"
        });
        }

        const hashedPassword = await hashPassword(newPassword);
        await pool.query({
        text: "UPDATE tbluser SET password = $1 WHERE id = $2 RETURNING *",
        values: [hashedPassword, userId]
        });
        res.status(200).json({
        status: "success",
        message: "Password updated successfully"
        });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const updateUser = async (req, res) => {
    try {
        const { userId } = req.body.user;
        const { first_name, last_name, contact_number } = req.body;

        const userExists = await pool.query({
            text: "SELECT * FROM tbluser WHERE id = $1",
            values: [userId]
        });

        const user = userExists.rows[0];
        if (!user) {
            return res.status(404).json({
                status: "failed",
                message: "User not found"
            });
        }

        const updatedUser = await pool.query({
            text: "UPDATE tbluser SET first_name = $1, last_name = $2, contact_number = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
            values: [first_name, last_name, contact_number, userId]
        });

        updatedUser.rows[0].password = undefined; // Exclude password from response
        res.status(200).json({
            status: "success",
            message: "User updated successfully",
            user: updatedUser.rows[0]
        });

    } catch (error) {
        
    }

}

// export const getUser = async (req, res) => {
//   try {
//     res.status(200).json({ message: "User signed in successfully" });
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// }