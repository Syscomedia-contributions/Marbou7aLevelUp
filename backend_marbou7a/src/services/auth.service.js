import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const BCRYPT_ROUNDS = 12;

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);
export const comparePassword = (password, hash) => bcrypt.compare(password, hash);

export const issueToken = (user) =>
  jwt.sign({ sub: user.id, phone: user.phone, role: user.role || "player" }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);
