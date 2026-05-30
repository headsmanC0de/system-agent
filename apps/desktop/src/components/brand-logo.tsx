import type * as React from "react";
import { BRAND_NAME } from "../lib/branding";

interface BrandLogoProps {
  label?: string;
  className?: string;
  size?: number;
}

const BrandLogo = ({
  label = BRAND_NAME,
  className,
  size = 32,
  ...props
}: BrandLogoProps & React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 36 40"
    fill="none"
    {...props}
    className={className}
    role="img"
    aria-label={`${label} logo`}
    width={size}
    height={(size * 40) / 36}
  >
    <path
      d="M11.6965 10.9571L7.12687 9.30642L9.24129 15.3117L11.6965 10.9571Z"
      fill="currentColor"
    />
    <path
      d="M9.85486 15.3118L12.3101 11.0976L16.061 12.9938L9.85486 15.3118Z"
      fill="currentColor"
    />
    <path
      d="M8.7639 16.3653L5.83105 23.4942L0.511381 11.9755L8.7639 16.3653Z"
      fill="currentColor"
    />
    <path d="M0 28.7622V11.9755L5.55848 23.9509L0 28.7622Z" fill="currentColor" />
    <path
      d="M6.44503 23.9509L9.24137 16.6815L13.1969 27.0414L6.44503 23.9509Z"
      fill="currentColor"
    />
    <path
      d="M5.55856 24.6882L0.716184 29.0432L7.26346 30.5531L5.55856 24.6882Z"
      fill="currentColor"
    />
    <path d="M16.9138 40L0.511381 29.7105L7.26326 31.1503L16.9138 40Z" fill="currentColor" />
    <path
      d="M21.3471 30.5531L14.7314 27.6383L26.4279 19.8773L21.3471 30.5531Z"
      fill="currentColor"
    />
    <path d="M34.7826 28.2355L27.7919 19.4206L34.7826 23.1784V28.2355Z" fill="currentColor" />
    <path
      d="M21.0062 31.5365L17.8349 39.3679L14.3224 28.3759L21.0062 31.5365Z"
      fill="currentColor"
    />
    <path
      d="M12.6172 10.3951L16.7435 12.6779L27.0078 8.49865L17.7665 0.491553L12.6172 10.3951Z"
      fill="currentColor"
    />
    <path d="M27.3489 8.11238L17.9714 0L32.1232 7.58562L27.3489 8.11238Z" fill="currentColor" />
    <path
      d="M4.87654 6.63738C4.93121 6.77787 6.24067 7.70253 6.88868 8.1476L12.106 10.2899L17.2892 0L4.87654 6.63738Z"
      fill="currentColor"
    />
    <path
      d="M4.22871 7.23463L0.272862 10.9572L6.20633 8.49874L4.22871 7.23463Z"
      fill="currentColor"
    />
    <path
      d="M6.68392 9.02537L8.76416 15.4522L0.886644 11.4486L6.68392 9.02537Z"
      fill="currentColor"
    />
    <path
      d="M9.85486 16.3653L13.9127 27.0414L26.4276 18.8238L16.9136 13.4153L9.85486 16.3653Z"
      fill="currentColor"
    />
    <path
      d="M32.1227 8.21774L27.2122 8.77971L17.4594 12.9938L27.0076 18.2618L32.1227 8.21774Z"
      fill="currentColor"
    />
    <path
      d="M32.8728 8.39337L27.7919 18.5427L34.7826 22.3706V11.9402L32.8728 8.39337Z"
      fill="currentColor"
    />
    <path
      d="M27.2463 19.6663L22.1655 30.8692L34.4758 28.6918L27.2463 19.6663Z"
      fill="currentColor"
    />
    <path
      d="M18.2436 39.6489L21.7561 31.6771L34.7141 29.2538L26.5131 34.5218L18.2436 39.6489Z"
      fill="currentColor"
    />
    <path
      d="M6.13782 24.5481L8.11576 31.1503L17.2206 39.649L13.6742 28.1651L6.13782 24.5481Z"
      fill="currentColor"
    />

    <title>{label}</title>
  </svg>
);

export default BrandLogo;