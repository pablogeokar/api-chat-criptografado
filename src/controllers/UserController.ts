import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { z } from "zod";
import { randomBytes } from "node:crypto";

export class UserController {
  async register(req: Request, res: Response) {
    const registerSchema = z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
    });

    const { name, email, password } = registerSchema.parse(req.body);

    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await hash(password, 10);

    // Gera 32 bytes aleatórios
    const keyPair = randomBytes(32);
    // Converte os bytes aleatórios para uma string hexadecimal
    const publicKey = keyPair.toString("hex");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        publicKey,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const token = sign({ id: user.id }, process.env.JWT_SECRET || "default", {
      expiresIn: "1d",
    });

    return res.json({ user, token });
  }

  async login(req: Request, res: Response) {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = sign({ id: user.id }, process.env.JWT_SECRET || "default", {
      expiresIn: "1d",
    });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  }
}
