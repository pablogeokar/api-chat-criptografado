import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import CryptoJS from "crypto-js";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Função para criptografar o conteúdo
function encrypt(content: string, key: Buffer): string {
  const iv = randomBytes(16); // Vetor de inicialização de 16 bytes (necessário para AES-CBC)
  // Cria o cipher usando o algoritmo, chave e IV
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  // Criptografa o conteúdo
  let encrypted = cipher.update(content, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Retorna o texto criptografado junto com o IV (necessário para a decriptação)
  return `${iv.toString("hex")}:${encrypted}`;
}

// Função para descriptografar o conteúdo
function decrypt(encryptedData: string, key: Buffer): string {
  // O dado criptografado é passado como "IV:encryptedContent"
  const [ivHex, encryptedContent] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");

  // Cria o decipher usando o algoritmo, chave e IV
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  // Descriptografa o conteúdo
  let decrypted = decipher.update(encryptedContent, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

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

    // Configurações para a criptografia

    //const key = Buffer.from(receiver.publicKey, "hex"); // A chave deve ter 32 bytes para AES-256

    // Criptografa o conteúdo usando a chave pública do receiver
    //const encryptedContent = encrypt(content, key);

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
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            publicKey: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            publicKey: true,
          },
        },
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

    // Decrypt messages
    // const decryptedMessages = messages.map((message) => {
    //   const isReceiver = message.receiverId === userId;
    //   const key = isReceiver
    //     ? Buffer.from(message.receiver.publicKey, "hex") // Chave pública do receiver
    //     : Buffer.from(message.sender.publicKey, "hex"); // Chave pública do sender

    //   const decryptedContent = decrypt(message.content, key);

    //   return {
    //     ...message,
    //     content: decryptedContent,
    //   };
    // });

    return res.json(decryptedMessages);
  }
}
