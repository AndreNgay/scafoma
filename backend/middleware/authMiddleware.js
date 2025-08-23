import JWT from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "failed",
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1]; // get the actual JWT
  try {
    const decoded = JWT.verify(token, process.env.JWT_SECRET_KEY);
    req.user = { id: decoded.userId }; // attach to request
    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return res.status(401).json({
      status: "failed",
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;
