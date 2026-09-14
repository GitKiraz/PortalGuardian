/** Cursos de graduação do Instituto Mauá de Tecnologia (fonte: https://maua.br/graduacao). */
export const MAUA_COURSES = [
  "Administração",
  "Análise e Desenvolvimento de Sistemas",
  "Arquitetura e Urbanismo",
  "Ciência da Computação",
  "Design",
  "Economia",
  "Engenharia Civil",
  "Engenharia de Alimentos",
  "Engenharia de Computação",
  "Engenharia de Controle e Automação",
  "Engenharia de Produção",
  "Engenharia Elétrica",
  "Engenharia Mecânica",
  "Engenharia Química",
  "Inteligência Artificial e Ciência de Dados",
  "Relações Internacionais",
  "Sistemas de Informação",
] as const;

export const isMauaCourse = (value: string) => (MAUA_COURSES as readonly string[]).includes(value);
