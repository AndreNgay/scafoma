import { comparePassword, hashPassword } from "../libs/index.js";
import { pool } from "../libs/database.js";


// Utility function for random password
const generateRandomPassword = (length = 6) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join("");
};

// ✅ Create concessionaire
export const createConcessionaire = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email already exists
    const exists = await pool.query({
      text: "SELECT id FROM tbluser WHERE email = $1",
      values: [email],
    });
    if (exists.rowCount > 0) {
      return res.status(400).json({
        status: "failed",
        message: "Email already in use",
      });
    }

    const passwordPlain = generateRandomPassword();
    const passwordHash = await hashPassword(passwordPlain);

    const result = await pool.query({
      text: `INSERT INTO tbluser (email, password, role, created_at) 
             VALUES ($1, $2, 'concessionaire', CURRENT_TIMESTAMP) 
             RETURNING id, email, role, created_at`,
      values: [email, passwordHash],
    });

    const user = result.rows[0];

    res.status(201).json({
      status: "success",
      message: "Concessionaire created successfully",
      user,
      password: passwordPlain, // return raw password
    });
  } catch (error) {
    console.error("Error creating concessionaire:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  }
};

// ✅ Reset password
export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const userExists = await pool.query({
      text: "SELECT id FROM tbluser WHERE id = $1",
      values: [id],
    });
    if (userExists.rowCount === 0) {
      return res.status(404).json({
        status: "failed",
        message: "User not found",
      });
    }

    const newPasswordPlain = generateRandomPassword();
    const newPasswordHash = await hashPassword(newPasswordPlain);

    await pool.query({
      text: "UPDATE tbluser SET password = $1 WHERE id = $2",
      values: [newPasswordHash, id],
    });

    res.status(200).json({
      status: "success",
      message: "Password reset successfully",
      newPassword: newPasswordPlain,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  }
};

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

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, first_name, last_name, email, contact_number, role, created_at, updated_at FROM tbluser ORDER BY created_at DESC");
    res.status(200).json({
      status: "success",
      message: "Users retrieved successfully",
      users: result.rows
    });
  } catch (error) {
    console.error("Error retrieving all users:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  }
};

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
    const { id } = req.params; // <-- get from params
    const { first_name, last_name, email, role } = req.body;

    const userExists = await pool.query({
      text: "SELECT * FROM tbluser WHERE id = $1",
      values: [id],
    });

    if (userExists.rowCount === 0) {
      return res.status(404).json({
        status: "failed",
        message: "User not found",
      });
    }

    const updatedUser = await pool.query({
      text: `UPDATE tbluser 
             SET first_name = $1, last_name = $2, email = $3, role = $4, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $5 RETURNING *`,
      values: [first_name, last_name, email, role, id],
    });

    const user = updatedUser.rows[0];
    if (user) user.password = undefined; // hide password

    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  }
};


export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userExists = await pool.query({
      text: "SELECT * FROM tbluser WHERE id = $1",
      values: [id],
    });

    if (userExists.rowCount === 0) {
      return res.status(404).json({
        status: "failed",
        message: "User not found",
      });
    }

    await pool.query({
      text: "DELETE FROM tbluser WHERE id = $1",
      values: [id],
    });

    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  }
};
