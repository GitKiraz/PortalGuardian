/**
 * Ícone da Guardian (corvo com coroa), vetorizado a partir da logo4 da identidade visual.
 * As cores seguem as variantes da identidade: preto/roxo/branco.
 */
export function GuardianLogo({
  className,
  body = "#000000",
  crown = "#b41cb8",
  ring = "#e6e6e6",
  stripe = "#ffffff",
}: {
  className?: string;
  body?: string;
  crown?: string;
  ring?: string;
  stripe?: string;
}) {
  return (
    <svg viewBox="0 0 600 626" className={className} role="img" aria-label="Guardian">
      <polygon fill={crown} points="307,32 371,32 371,75 395,75 395,0 449,0 449,76 473,76 473,44 530,44 530,122 313,122" />
      <g fill={body}>
        <circle cx="416.5" cy="323.6" r="182.7" />
        <polygon points="0,268 300,200 300,447 0,396" />
        <polygon points="380,460 472,460 472,626 214,626" />
      </g>
      <rect fill={stripe} x="0" y="318" width="222" height="13" />
      <circle cx="420" cy="324" r="86.5" fill="none" stroke={ring} strokeWidth="35" />
    </svg>
  );
}
