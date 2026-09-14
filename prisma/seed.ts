import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const email = process.env.SEED_DEV_EMAIL?.toLowerCase();
  const password = process.env.SEED_DEV_PASSWORD;
  if (!email || !password) throw new Error("Defina SEED_DEV_EMAIL e SEED_DEV_PASSWORD no .env");

  if (!(await prisma.user.findUnique({ where: { email } }))) {
    await prisma.user.create({
      data: {
        name: process.env.SEED_DEV_NAME ?? "Dev Guardian",
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "DEV",
        status: "ATIVO",
      },
    });
    console.log(`Conta Dev criada: ${email}`);
  }

  const areas = [
    {
      slug: "registro",
      name: "Registro",
      isGlobal: true,
      description:
        "Documentação: técnicas de note-taking a partir de desafios CTF (TryHackMe, PicoCTF, HackTheBox…), " +
        "criação de relatórios e de um repertório de desafios para competições como o Mauá CTF. " +
        "Área global, aberta a todos os alunos Juniors e Plenos. Responsável pela CTF Night.",
    },
    {
      slug: "pesquisa",
      name: "Pesquisa",
      description:
        "Estudo técnico em áreas específicas da segurança ofensiva e defensiva. Cada pesquisa termina em um " +
        "projeto final (um CTF ou uma capacitação) documentado no GitHub. Prepara os ambientes de CTF, como o Mauá CTF.",
    },
    { slug: "oficina", name: "Oficina" },
    { slug: "nspi", name: "NSPi" },
  ];
  for (const [order, area] of areas.entries()) {
    if (!(await prisma.area.findUnique({ where: { slug: area.slug } }))) {
      await prisma.area.create({ data: { ...area, order } });
      console.log(`Área ${area.name} criada`);
    }
  }

  if (!(await prisma.room.findFirst({ where: { kind: "COORDENACAO" } }))) {
    await prisma.room.create({ data: { kind: "COORDENACAO", name: "Sala da Coordenação" } });
    console.log("Sala da Coordenação criada");
  }

  if (!(await prisma.course.findFirst({ where: { requiredForPleno: true } }))) {
    await prisma.course.create({
      data: {
        title: "Capacitação 1 - Web Exploit",
        description:
          "Ethical Hacking em aplicações web (Web-Hacking Mauá), com exercícios internos e máquinas do TryHackMe. " +
          "Requisito para o Junior virar Pleno: assista a todas as vídeo aulas.",
        order: 1,
        requiredForPleno: true,
      },
    });
    console.log("Curso Capacitação 1 - Web Exploit criado (adicione as aulas pelo portal)");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
