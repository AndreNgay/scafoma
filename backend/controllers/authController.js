import { pool } from "../libs/database.js";
import { comparePassword, createJWT, hashPassword } from "../libs/index.js";

export const signupUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        status: "failed",
        message: "All fields are required"
      });
    }

    const userExist = await pool.query({
      text: "SELECT EXISTS (SELECT 1 FROM tbluser WHERE email = $1)",
      values: [email]
    });

    // In Postgres, the result key is usually 'exists'
    if (userExist.rows[0].exists) {
      return res.status(400).json({
        status: "failed",
        message: "Email already exists. Try Login"
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await pool.query({
      text: `
        INSERT INTO tbluser (email, first_name, last_name, password) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `,
      values: [email, first_name, last_name, hashedPassword]
    });

    user.rows[0].password = undefined;

    res.status(201).json({
      status: "success",
      message: "User created successfully",
      user: user.rows[0],
    });

  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};


export const signinUser = async (req, res) => {
  try {
    const {email, password} = req.body;
    const result = await pool.query({
      text: "SELECT * FROM tbluser WHERE email = $1",
      values: [email]
    });
    const user = result.rows[0];
    if(!user) {
      return res.status(400).json({ 
        status: "failed",
        message: "Invalid email or password"
      });
    }
    const isMatch = await comparePassword(password, user.password);
    if(!isMatch) {
      return res.status(400).json({ 
        status: "failed",
        message: "Invalid email or password"
      });
    }
    const token = createJWT(user.id);
    user.password = undefined;
    res.status(200).json({
      status: "success",
      message: "User signed in successfully",
      user: user,
      token: token
    });

  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
  }
}

// export const signinUser = async (req, res) => {
//   try {
//     res.status(200).json({ message: "User signed in successfully" });
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// }