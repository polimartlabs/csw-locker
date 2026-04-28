/**
 * Placeholder for an embedded wallet / WaaS (passkey, Google OAuth) track.
 * Integrations (e.g. Privy, Dynamic) must map entitlements to your policy engine:
 * e.g. device key as cosigner, 2FA only, or export rules — decide before shipping.
 * Always keep a path to connect Leather / Xverse via @stacks/connect instead of stranding users.
 */
export type EmbeddedAuthMode = "not_configured" | "passkey" | "oauth_google";

export interface EmbeddedWalletPolicyHook {
  mode: EmbeddedAuthMode;
  /** When a provider is added, return policy hints for the execution layer. */
  describePolicyEntitlements?: () => { canCosign: boolean; canRecover: boolean };
}

export const embeddedWalletPolicyPlaceholder: EmbeddedWalletPolicyHook = {
  mode: "not_configured",
};
