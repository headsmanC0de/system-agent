import branding from "../../../../branding.json" with { type: "json" };

export const ORG_NAME = branding.organization.name;
export const ORG_URL = branding.organization.url;
export const ORG_DOMAIN = branding.organization.domain;

export const BRAND_NAME = branding.name;
export const BRAND_SHORT = branding.shortName;
export const BRAND_ID = branding.id;
export const BRAND_TAGLINE = branding.tagline;
export const BRAND_COPYRIGHT = `© ${new Date().getFullYear()} ${ORG_NAME}`;
export const BRAND_URL = `https://${BRAND_ID}.${ORG_DOMAIN}`;
export const STORAGE_PREFIX = branding.storagePrefix;
export const LEGACY_STORAGE_PREFIXES = branding.legacyStoragePrefixes;
export const BRANDED_APP_TITLE = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
