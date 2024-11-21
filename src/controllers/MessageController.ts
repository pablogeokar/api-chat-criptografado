import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import CryptoJS from "crypto-js";

export class MessageController {
  async send(req: Request, res: Response) {
    const messageSchema = z.object({
      content: z.string(),
      receiverId: z.string(),
    });

    const { content, receiverId } = messageSchema.parse(req.body);
    const senderId = req.userId;

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return res.status(400).json({ error: "Receiver not found" });
    }

    // Encrypt message with receiver's public key
    const encryptedContent = CryptoJS.AES.encrypt(
      content,
      receiver.publicKey
    ).toString();

    const message = await prisma.message.create({
      data: {
        content: encryptedContent,
        senderId,
        receiverId,
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    return res.json(message);
  }

  async getChat(req: Request, res: Response) {
    const { receiverId } = req.params;
    const userId = req.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId },
        ],
      },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Decrypt messages
    const decryptedMessages = messages.map((message) => {
      const isReceiver = message.receiverId === userId;
      const key = isReceiver
        ? message.receiver.publicKey
        : message.sender.publicKey;

      const decryptedContent = CryptoJS.AES.decrypt(
        message.content,
        key
      ).toString(CryptoJS.enc.Utf8);

      return {
        ...message,
        content: decryptedContent,
      };
    });

    return res.json(decryptedMessages);
  }
}
